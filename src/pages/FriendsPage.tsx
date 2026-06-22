import { Check, ChevronRight, Clock3, Compass, Copy, Inbox, Link2, LoaderCircle, MapPin, Search, UserMinus, UserPlus, UsersRound, X } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PlaceCard from '../components/PlaceCard'
import PremiumEmptyState from '../components/PremiumEmptyState'
import ProductHero from '../components/ProductHero'
import UserAvatar from '../components/UserAvatar'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { answerFriendRequest, friendInviteUrl, friendProfileFor, loadFriendActivity, loadFriendships, loadProfile, removeFriendship, searchProfiles, sendFriendRequest, shareFriendInvite, type FriendActivity, type FriendProfile } from '../lib/friendships'
import type { Friendship } from '../types'

type FriendTab = 'friends' | 'requests' | 'find' | 'activity'
type FriendPreview = FriendProfile

function ProfileAvatar({ profile, large = false }: { profile?: Pick<FriendProfile, 'display_name' | 'avatar_url'> | null; large?: boolean }) {
  return <UserAvatar className={`friend-avatar ${large ? 'friend-avatar-large' : ''}`} url={profile?.avatar_url} name={profile?.display_name}/>
}

export default function FriendsPage() {
  const { user } = useSocial()
  const userId = user?.id || ''
  const { places, toggleLike } = usePlaces()
  const [params, setParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<FriendTab>('friends')
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [activities, setActivities] = useState<FriendActivity[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const [results, setResults] = useState<FriendProfile[]>([])
  const [inviteProfile, setInviteProfile] = useState<FriendProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [openProfile, setOpenProfile] = useState<FriendPreview | null>(null)

  const load = useCallback(async () => {
    setError('')
    try { setFriendships(await loadFriendships()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Freunde konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const groups = useMemo(() => {
    if (!userId) return { friends: [], incoming: [], outgoing: [] }
    return {
      friends: friendships.filter((item) => item.status === 'accepted'),
      incoming: friendships.filter((item) => item.status === 'pending' && item.addressee_id === userId),
      outgoing: friendships.filter((item) => item.status === 'pending' && item.requester_id === userId),
    }
  }, [friendships, userId])
  const friendProfiles = useMemo(() => userId ? groups.friends.map((item) => friendProfileFor(item, userId)).filter((profile): profile is FriendProfile => Boolean(profile)) : [], [groups.friends, userId])
  const friendProfileMap = useMemo(() => new Map(friendProfiles.map((profile) => [profile.id, profile])), [friendProfiles])
  const visibleActivities = useMemo(() => activities.filter((item) => friendProfileMap.has(item.user_id)), [activities, friendProfileMap])
  const placeMap = useMemo(() => new Map(places.map((place) => [place.id, place])), [places])

  useEffect(() => {
    const friendIds = friendProfiles.map((profile) => profile.id)
    if (!friendIds.length) return
    loadFriendActivity(friendIds).then(setActivities).catch((cause) => setError(cause instanceof Error ? cause.message : 'Aktivitäten konnten nicht geladen werden.'))
  }, [friendProfiles])

  const inviteId = params.get('invite')
  useEffect(() => {
    if (!userId || !inviteId || inviteId === userId) return
    loadProfile(inviteId).then(setInviteProfile).catch(() => setError('Die Einladung konnte nicht geöffnet werden.'))
  }, [inviteId, userId])

  const runSearch = useCallback(async (value: string) => {
    if (!userId || value.trim().length < 2) return
    setSearching(true); setError(''); setMessage('')
    try { setResults(await searchProfiles(value, userId)) }
    catch { setError('Die Suche ist gerade nicht verfügbar.') }
    finally { setSearching(false) }
  }, [userId])
  useEffect(() => {
    if (deferredQuery.length < 2) return
    const timeout = window.setTimeout(() => { void runSearch(deferredQuery) }, 250)
    return () => window.clearTimeout(timeout)
  }, [deferredQuery, runSearch])

  if (!user) return null

  const relationFor = (profileId: string) => friendships.find((item) => item.status !== 'rejected' && (item.requester_id === profileId || item.addressee_id === profileId))
  const perform = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id); setError(''); setMessage('')
    try { await action(); setMessage(success); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Aktion fehlgeschlagen.') }
    finally { setBusyId('') }
  }
  const connect = (profile: FriendProfile) => {
    const relation = relationFor(profile.id)
    if (relation?.status === 'accepted') return <button className="connection-state" disabled><Check/> Befreundet</button>
    if (relation?.status === 'pending' && relation.addressee_id === userId) return <button className="primary-button" disabled={busyId === relation.id} onClick={() => perform(relation.id, () => answerFriendRequest(relation.id, 'accepted'), 'Anfrage angenommen.')}><Check/> Anfrage annehmen</button>
    if (relation?.status === 'pending') return <button className="connection-state" disabled><Clock3/> Anfrage gesendet</button>
    return <button className="primary-button" disabled={busyId === profile.id} onClick={() => perform(profile.id, () => sendFriendRequest(profile.id), 'Freundschaftsanfrage gesendet.')}><UserPlus/> Anfrage senden</button>
  }
  const invite = async () => {
    setError(''); setMessage('')
    try {
      const result = await shareFriendInvite(friendInviteUrl(window.location.origin, userId))
      setMessage(result === 'copied' ? 'Einladungslink kopiert.' : 'Einladung geteilt.')
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === 'AbortError') return
      setError('Der Einladungslink konnte nicht geteilt werden.')
    }
  }
  const closeInvite = () => { setInviteProfile(null); params.delete('invite'); setParams(params, { replace: true }) }
  const search = (event: FormEvent) => { event.preventDefault(); void runSearch(query) }
  const visitedPlaces = [...new Map(visibleActivities.filter((item) => item.kind === 'visit').map((item) => [item.place_id, placeMap.get(item.place_id)])).values()].filter(Boolean)
  const activityText = (item: FriendActivity) => item.kind === 'visit' ? 'war bei' : item.kind === 'favorite' ? 'hat gespeichert' : 'hat ein Foto hochgeladen bei'

  return <div className="content-page friends-page social-product-page">
    <ProductHero className="community-product-hero" title="Freunde entdecken mehr" description="Finde deine Leute, verwalte Anfragen und sieh nur die Orte, die bestätigte Freunde bewusst als besucht markiert haben." action={<button className="secondary-button friend-invite-button" onClick={() => void invite()}><Link2/> Freund einladen</button>}/>

    {inviteProfile && inviteProfile.id === inviteId && inviteId !== userId && <section className="friend-invite-context" aria-label="Freundeseinladung"><ProfileAvatar profile={inviteProfile} large/><div><small>Einladung zu ExplorerX</small><strong>{inviteProfile.display_name || 'Ein Explorer'} möchte sich mit dir verbinden.</strong><p>Die Freundschaft entsteht erst, wenn die Anfrage bestätigt wurde.</p></div>{connect(inviteProfile)}<button className="icon-button" onClick={closeInvite} aria-label="Einladung schliessen"><X/></button></section>}
    {message && <p className="community-photo-success" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}

    <nav className="friends-tabs" aria-label="Freunde-Bereiche">
      {([
        ['friends', 'Meine Freunde', groups.friends.length, UsersRound],
        ['requests', 'Anfragen', groups.incoming.length + groups.outgoing.length, Inbox],
        ['find', 'Freunde finden', 0, Search],
        ['activity', 'Aktivitäten', visibleActivities.length, Clock3],
      ] as const).map(([id, label, count, Icon]) => <button key={id} className={activeTab === id ? 'active' : ''} aria-current={activeTab === id ? 'page' : undefined} onClick={() => setActiveTab(id)}><Icon/>{label}{count > 0 && <span>{count}</span>}</button>)}
    </nav>

    {activeTab === 'friends' && <section className="friends-tab-panel"><div className="community-heading"><div><h2>Meine Freunde</h2><p>Bestätigte Kontakte und ihre freiwillig geteilten Entdeckungen.</p></div><button className="text-button" onClick={() => void invite()}><Copy/> Einladen</button></div>{loading ? <div className="friend-card-skeletons"><span/><span/></div> : groups.friends.length ? <div className="friend-card-grid">{groups.friends.map((item) => { const profile = friendProfileFor(item, userId); return <article className="friend-profile-card" key={item.id}><ProfileAvatar profile={profile} large/><div className="friend-profile-copy"><strong>{profile?.display_name || 'Explorer'}</strong><span>Freund seit {new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(item.updated_at))}</span></div><div className="friend-profile-actions"><button className="profile-open" onClick={() => setOpenProfile(profile || null)}><Compass/> Profil öffnen</button><button className="danger-subtle" onClick={() => perform(item.id, () => removeFriendship(item.id), 'Freund entfernt.')} disabled={busyId === item.id} aria-label={`${profile?.display_name || 'Freund'} entfernen`}><UserMinus/></button></div></article>})}</div> : <PremiumEmptyState icon={<UsersRound/>} title="Dein Freundeskreis ist noch leer" description="Lade jemanden mit deinem persönlichen Link ein oder finde Explorer über den Anzeigenamen." action={<div className="empty-actions"><button className="primary-button" onClick={() => void invite()}><Link2/> Freunde einladen</button><button className="secondary-button" onClick={() => setActiveTab('find')}><Search/> Explorer suchen</button></div>}/>}</section>}

    {activeTab === 'requests' && <section className="friends-tab-panel"><div className="community-heading"><div><h2>Anfragen</h2><p>Du entscheidest, wer Teil deines Freundeskreises wird.</p></div><Inbox/></div>{groups.incoming.length ? <div className="request-card-grid">{groups.incoming.map((item) => <article className="request-card" key={item.id}><ProfileAvatar profile={item.requester} large/><div><strong>{item.requester?.display_name || 'Explorer'}</strong><span>Möchte sich mit dir verbinden</span></div><div className="request-actions"><button className="accept" onClick={() => perform(item.id, () => answerFriendRequest(item.id, 'accepted'), 'Anfrage angenommen.')} disabled={busyId === item.id} aria-label="Anfrage annehmen"><Check/> Annehmen</button><button onClick={() => perform(item.id, () => answerFriendRequest(item.id, 'rejected'), 'Anfrage abgelehnt.')} disabled={busyId === item.id} aria-label="Anfrage ablehnen"><X/> Ablehnen</button></div></article>)}</div> : <PremiumEmptyState compact icon={<Inbox/>} title="Keine neuen Anfragen" description="Neue Einladungen erscheinen hier und werden nie automatisch angenommen."/>}{groups.outgoing.length > 0 && <div className="outgoing-requests"><h3>Gesendet</h3>{groups.outgoing.map((item) => <div key={item.id}><ProfileAvatar profile={item.addressee}/><span><strong>{item.addressee?.display_name || 'Explorer'}</strong><small>Antwort ausstehend</small></span><button onClick={() => perform(item.id, () => removeFriendship(item.id), 'Anfrage zurückgezogen.')} disabled={busyId === item.id} aria-label="Anfrage zurückziehen"><X/></button></div>)}</div>}</section>}

    {activeTab === 'find' && <section className="friends-tab-panel"><div className="community-heading"><div><h2>Freunde finden</h2><p>Suche nach dem öffentlichen Anzeigenamen.</p></div><Search/></div><form className="friend-search friend-search-live" onSubmit={search}><Search/><label><span className="sr-only">Freunde nach Anzeigename suchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={40} autoComplete="off" placeholder="Explorer nach Anzeigename suchen…"/></label>{searching ? <LoaderCircle className="spin" aria-label="Suche läuft"/> : query && <button type="button" className="search-clear" onClick={() => { setQuery(''); setResults([]) }} aria-label="Suche leeren"><X/></button>}<button className="sr-only" type="submit">Suchen</button></form>{query.trim().length < 2 ? <PremiumEmptyState compact icon={<Search/>} title="Wen suchst du?" description="Gib mindestens zwei Zeichen des Anzeigenamens ein."/> : results.length ? <div className="people-grid people-grid-premium">{results.map((profile) => <article className="person-card person-card-premium" key={profile.id}><ProfileAvatar profile={profile} large/><div className="person-card-copy"><strong>{profile.display_name || 'Explorer'}</strong>{profile.bio && <p>{profile.bio}</p>}</div>{connect(profile)}</article>)}</div> : !searching && <PremiumEmptyState compact icon={<Search/>} title="Kein Explorer gefunden" description="Prüfe den Anzeigenamen oder teile stattdessen deinen Einladungslink." action={<button className="secondary-button" onClick={() => void invite()}><Link2/> Freund einladen</button>}/>}</section>}

    {activeTab === 'activity' && <section className="friends-tab-panel"><div className="community-heading"><div><h2>Aktivitäten</h2><p>Nur echte Aktionen deiner bestätigten Freunde.</p></div><Clock3/></div>{visitedPlaces.length > 0 && <div className="friend-visited-places"><h3>Orte, an denen deine Freunde waren</h3><div>{visitedPlaces.slice(0, 6).map((place) => place && <PlaceCard compact key={place.id} place={place} onLike={() => toggleLike(place.id)}/>)}</div></div>}{visibleActivities.length ? <div className="activity-feed-list">{visibleActivities.map((item) => { const explorer = friendProfileMap.get(item.user_id); const place = placeMap.get(item.place_id); if (!place || !explorer) return null; return <article key={item.id}><ProfileAvatar profile={explorer}/><div><strong>{explorer.display_name || 'Explorer'}</strong><span>{activityText(item)} <Link to={`/places/${place.id}`}>{place.name}</Link></span><small>{new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(item.created_at))}</small></div><Link className="activity-place-link" to={`/places/${place.id}`} aria-label={`${place.name} öffnen`}><ChevronRight/></Link></article>})}</div> : <PremiumEmptyState icon={<MapPin/>} title="Noch keine Freundesaktivitäten" description={groups.friends.length ? 'Besuche, gespeicherte Orte und neue Fotos deiner Freunde erscheinen hier.' : 'Füge zuerst Freunde hinzu. Private Besuche bleiben für andere verborgen.'}/>}</section>}

    {openProfile && <div className="profile-preview-backdrop" role="dialog" aria-modal="true" aria-label={`${openProfile.display_name || 'Explorer'} Profil`}><article className="profile-preview-card"><button className="preview-close" onClick={() => setOpenProfile(null)} aria-label="Profil schliessen"><X/></button><ProfileAvatar profile={openProfile} large/><h2>{openProfile.display_name || 'Explorer'}</h2>{openProfile.bio && <p>{openProfile.bio}</p>}<div className="friend-profile-visits"><h3>Besuchte Orte</h3>{visibleActivities.filter((item) => item.kind === 'visit' && item.user_id === openProfile.id).map((item) => placeMap.get(item.place_id)).filter(Boolean).slice(0, 8).map((place) => place && <Link key={place.id} to={`/places/${place.id}`} onClick={() => setOpenProfile(null)}><MapPin/>{place.name}<ChevronRight/></Link>)}{!visibleActivities.some((item) => item.kind === 'visit' && item.user_id === openProfile.id) && <p>Noch keine freigegebenen Besuche.</p>}</div><button className="secondary-button" onClick={() => setOpenProfile(null)}>Schliessen</button></article></div>}
  </div>
}
