import { Award, Bookmark, Camera, Footprints, Image, LogOut, MapPin, MessageCircle, Save, ShieldCheck, Sparkles, Star, UserRound, UsersRound } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSocial } from '../context/SocialContext'
import { usePlaces } from '../context/PlacesContext'
import { loadFriendships } from '../lib/friendships'
import { supabase } from '../lib/supabase'
import UserAvatar from '../components/UserAvatar'
import { levelForXp } from '../lib/achievements'

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
  const level = levelForXp(stats.xp)
  const levelProgress = Math.round((level.progress / level.target) * 100)
  const pickAvatar = (file?: File) => { setError(''); if (!file) return; if (!['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > 2_000_000) return setError('JPG, PNG oder WebP bis 2 MB verwenden.'); if (preview) URL.revokeObjectURL(preview); setAvatar(file); setPreview(URL.createObjectURL(file)) }
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(''); if (name.trim().length < 2 || name.trim().length > 40) return setError('Der Anzeigename muss 2 bis 40 Zeichen lang sein.'); if (bio.length > 160) return setError('Die Bio darf höchstens 160 Zeichen lang sein.'); setSaving(true); try { await updateProfile(name, bio, avatar); setAvatar(undefined) } catch (cause) { setError(cause instanceof Error ? cause.message : 'Profil konnte nicht gespeichert werden.') } finally { setSaving(false) } }
  const logout = async () => { setError(''); try { await signOut(); navigate('/login', { replace: true }) } catch { setError('Abmelden ist fehlgeschlagen. Bitte lade die Seite neu und versuche es erneut.') } }
  const visitedPlaces = places.filter((place) => visitedIds.has(place.id))
  const coverImage = ownPhotos[0]?.url || visitedPlaces.find((place) => place.image_url)?.image_url || places.find((place) => place.created_by === user.id && place.image_url)?.image_url || ''

  return <div className="profile-page content-page">
    <section className="profile-hero"><div className="profile-cover" style={coverImage ? { backgroundImage: `url(${coverImage})` } : undefined}/><div className="profile-identity"><UserAvatar className="profile-avatar" url={preview || profile?.avatar_url} name={profile?.display_name || user.email} imageAlt="Profilbild"><label className="avatar-upload"><Camera/><span className="sr-only">Profilbild wählen</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => pickAvatar(event.target.files?.[0])}/></label></UserAvatar><div><div className="level-label"><Sparkles/> Explorer Level {level.level}</div><h1>{profile?.display_name || 'Neues Profil'}</h1><p>{profile?.bio || 'Erzähl der Community kurz, was du gern entdeckst.'}</p><div className="profile-xp" aria-label={`${level.progress} von ${level.target} XP bis Level ${level.nextLevel}`}><div><span>{stats.xp} XP gesamt</span><strong>Noch {level.remaining} XP bis Level {level.nextLevel}</strong></div><span><i style={{ width: `${levelProgress}%` }}/></span></div><div className="profile-actions">{isAdmin && <Link className="secondary-button" to="/admin"><ShieldCheck/> Adminbereich</Link>}<button className="secondary-button" type="button" onClick={logout}><LogOut/> Abmelden</button></div></div></div></section>
    <section className="profile-stats profile-stats-wide"><div><Star/><strong>{stats.xp}</strong><span>XP</span></div><div><MapPin/><strong>{stats.places}</strong><span>Orte</span></div><div><Image/><strong>{stats.photos}</strong><span>Fotos</span></div><div><Footprints/><strong>{stats.visited}</strong><span>Besucht</span></div><div><MessageCircle/><strong>{stats.comments}</strong><span>Kommentare</span></div><div><Bookmark/><strong>{favoriteIds.size}</strong><span>Gespeichert</span></div><div><UsersRound/><strong>{friendCount}</strong><span>Freunde</span></div></section>
    <nav className="profile-section-tabs" aria-label="Profilbereiche"><a href="#profile-places">Orte</a><a href="#profile-photos">Fotos</a><a href="#profile-badges">Badges</a><Link to="/friends">Aktivität</Link></nav>
    <div className="profile-grid"><section className="profile-main"><form className="profile-form" onSubmit={submit}><div><h2>Dein Profil</h2><p>So sehen dich andere Explorer.</p></div><label>Anzeigename<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Dein Name"/></label><label>Über dich<textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={160} rows={3} placeholder="Was entdeckst du am liebsten?"/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="primary-button" disabled={saving}><Save/>{saving ? 'Speichern…' : 'Profil speichern'}</button></form><div className="profile-quick-links"><Link to="/favorites"><Bookmark/>Favoriten</Link><Link to="/trending"><Sparkles/>Trending</Link><Link to="/friends"><UsersRound/>Community</Link></div></section><aside className="achievements-panel" id="profile-badges"><h2><Award/> Badge-Sammlung</h2><p>{unlocked.length} von {achievements.length} Achievements freigeschaltet.</p><div className="achievement-grid">{achievements.map((achievement) => <div className={`achievement ${achievement.unlocked ? 'unlocked' : 'locked'}`} key={achievement.id}><span><Award/></span><div><strong>{achievement.title}</strong><small>{achievement.description}</small><i>{Math.min(achievement.progress, achievement.target)} / {achievement.target}</i></div></div>)}</div></aside></div>
    <section className="profile-history" id="profile-places"><div className="section-heading"><div><h2><Footprints/> War hier</h2><p>Deine persönliche Entdeckungshistorie.</p></div><span>{visitedPlaces.length}</span></div>{visitedPlaces.length ? <div className="profile-place-rail">{visitedPlaces.map((place) => <Link to={`/places/${place.id}`} key={place.id}>{place.image_url ? <img src={place.image_url} alt={place.name} loading="lazy"/> : <span><MapPin/></span>}<strong>{place.name}</strong><small>{place.category}</small></Link>)}</div> : <div className="social-empty"><Footprints/><strong>Noch kein Besuch markiert.</strong><span>Tippe bei einem Ort auf „Ich war hier“.</span></div>}</section>
    <section className="profile-history" id="profile-photos"><div className="section-heading"><div><h2><Camera/> Deine Community-Fotos</h2><p>Perspektiven, die du mit ExplorerX geteilt hast.</p></div><span>{ownPhotos.length}</span></div>{ownPhotos.length ? <div className="profile-photo-grid">{ownPhotos.map((photo) => <Link to={`/places/${photo.placeId}`} key={photo.id}><img src={photo.url} alt="Eigenes Community-Foto" loading="lazy" decoding="async"/></Link>)}</div> : <div className="social-empty"><Camera/><strong>Noch keine Fotos geteilt.</strong><span>Auf jeder Ortsdetailseite kannst du Fotos hinzufügen.</span></div>}</section>
  </div>
}
