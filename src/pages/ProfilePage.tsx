import { Award, Bookmark, Camera, Compass, Footprints, Heart, Images, LogOut, MapPin, Save, ShieldCheck, Sparkles, UserRound, UsersRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSocial } from '../context/SocialContext'
import { usePlaces } from '../context/PlacesContext'
import { loadFriendships } from '../lib/friendships'
import { supabase } from '../lib/supabase'
import UserAvatar from '../components/UserAvatar'

export default function ProfilePage() {
  const { user, isLoading } = useSocial()
  if (isLoading) return <div className="content-page loading-state" role="status">Profil wird geladen…</div>
  if (!user) return <div className="content-page empty-state"><UserRound size={48}/><h1>Dein ExplorerX-Profil</h1><p>Melde dich an, um Favoriten, Kommentare und Achievements auf allen Geräten zu nutzen.</p><Link className="primary-button" to="/login">Jetzt anmelden</Link></div>
  return <LoadedProfilePage key={user.id}/>
}

function LoadedProfilePage() {
  const { user, profile, stats, achievements, favoriteIds, visitedIds, isAdmin, updateProfile, signOut } = useSocial()
  const { places } = usePlaces()
  const navigate = useNavigate()
  const [name, setName] = useState(() => profile?.display_name || '')
  const [bio, setBio] = useState(() => profile?.bio || '')
  const [avatar, setAvatar] = useState<File>()
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [friendCount, setFriendCount] = useState(0)
  const [ownPhotos, setOwnPhotos] = useState<Array<{ id: string; placeId: string; url: string }>>([])
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])
  useEffect(() => {
    const client = supabase
    if (!user || !client) return
    let active = true
    Promise.all([
      loadFriendships().catch(() => []),
      client.from('photos').select('id,place_id,storage_path').eq('uploaded_by', user.id).order('created_at', { ascending: false }).limit(24),
    ]).then(([friendships, photoResult]) => {
      if (!active) return
      setFriendCount(friendships.filter((item) => item.status === 'accepted').length)
      setOwnPhotos((photoResult.data || []).map((photo) => ({ id: photo.id, placeId: photo.place_id, url: client.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl })))
    })
    return () => { active = false }
  }, [user])
  if (!user) return null
  const unlocked = achievements.filter((achievement) => achievement.unlocked)
  const level = Math.max(1, 1 + Math.floor((stats.places + stats.visited + unlocked.length * 2) / 5))
  const pickAvatar = (file?: File) => { setError(''); if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) return setError('JPG, PNG oder WebP bis 2 MB verwenden.'); if (preview) URL.revokeObjectURL(preview); setAvatar(file); setPreview(URL.createObjectURL(file)) }
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); if (name.trim().length < 2 || name.trim().length > 40) return setError('Der Anzeigename muss 2 bis 40 Zeichen lang sein.'); if (bio.length > 160) return setError('Die Bio darf höchstens 160 Zeichen lang sein.'); setSaving(true); try { await updateProfile(name, bio, avatar); setAvatar(undefined) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profil konnte nicht gespeichert werden.') } finally { setSaving(false) } }
  const logout = async () => { setError(''); try { await signOut(); navigate('/login', { replace: true }) } catch { setError('Abmelden ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.') } }
  const visitedPlaces = places.filter((place) => visitedIds.has(place.id))

  return <div className="profile-page content-page">
    <section className="profile-hero"><div className="profile-cover"/><div className="profile-identity"><UserAvatar className="profile-avatar" url={preview || profile?.avatar_url} name={profile?.display_name || user.email} imageAlt="Profilbild"><label className="avatar-upload"><Camera/><span className="sr-only">Profilbild wählen</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickAvatar(event.target.files?.[0])}/></label></UserAvatar><div><div className="level-label"><Sparkles/> Explorer Level {level}</div><h1>{profile?.display_name || 'Neues Profil'}</h1><p>{profile?.bio || 'Erzähl der Community kurz, was du gern entdeckst.'}</p><div className="profile-actions">{isAdmin && <Link className="secondary-button" to="/admin"><ShieldCheck/> Adminbereich</Link>}<button className="secondary-button" type="button" onClick={logout}><LogOut/> Abmelden</button></div></div></div></section>
    <section className="profile-stats"><div><Compass/><strong>{stats.visited}</strong><span>Entdeckte Orte</span></div><div><MapPin/><strong>{stats.places}</strong><span>Hinzugefügt</span></div><div><Bookmark/><strong>{favoriteIds.size}</strong><span>Gespeichert</span></div><div><UsersRound/><strong>{friendCount}</strong><span>Freunde</span></div><div><Images/><strong>{ownPhotos.length}</strong><span>Eigene Fotos</span></div><div><Heart/><strong>{stats.likesReceived}</strong><span>Likes erhalten</span></div></section>
    <div className="profile-grid"><section className="profile-main"><form className="profile-form" onSubmit={submit}><div><h2>Dein Profil</h2><p>So sehen dich andere Explorer.</p></div><label>Anzeigename<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Dein Name"/></label><label>Über dich<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} placeholder="Was entdeckst du am liebsten?"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={saving}><Save/>{saving ? 'Speichern…' : 'Profil speichern'}</button></form><Link className="profile-community-link" to="/friends"><UsersRound/><div><strong>Dein Explorer Circle</strong><span>{friendCount ? `${friendCount} bestätigte Freunde` : 'Finde Freunde aus der Community'}</span></div></Link></section><aside className="achievements-panel"><h2><Award/> Deine Badges</h2><p>Jede echte Entdeckung bringt dich weiter.</p>{achievements.map((achievement) => <div className={`achievement ${achievement.unlocked ? 'unlocked' : ''}`} key={achievement.id}><span><Award/></span><div><strong>{achievement.title}</strong><small>{achievement.description}</small></div></div>)}</aside></div>
    <section className="profile-history"><div className="section-heading"><div><h2><Footprints/> War hier</h2><p>Deine persönliche Entdeckungshistorie.</p></div><span>{visitedPlaces.length}</span></div>{visitedPlaces.length ? <div className="profile-place-rail">{visitedPlaces.map((place) => <Link to={`/places/${place.id}`} key={place.id}>{place.image_url ? <img src={place.image_url} alt="" loading="lazy"/> : <span><MapPin/></span>}<strong>{place.name}</strong><small>{place.category}</small></Link>)}</div> : <div className="social-empty"><Footprints/><strong>Noch kein Besuch markiert.</strong><span>Tippe bei einem Ort auf „Ich war hier“.</span></div>}</section>
    <section className="profile-history"><div className="section-heading"><div><h2><Camera/> Deine Community-Fotos</h2><p>Perspektiven, die du mit ExplorerX geteilt hast.</p></div><span>{ownPhotos.length}</span></div>{ownPhotos.length ? <div className="profile-photo-grid">{ownPhotos.map((photo) => <Link to={`/places/${photo.placeId}`} key={photo.id}><img src={photo.url} alt="Eigenes Community-Foto" loading="lazy" decoding="async"/></Link>)}</div> : <div className="social-empty"><Camera/><strong>Noch keine Fotos geteilt.</strong><span>Auf jeder Ortsdetailseite kannst du Fotos hinzufügen.</span></div>}</section>
  </div>
}
