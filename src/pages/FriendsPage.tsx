import { Award, Camera, Check, ChevronRight, Compass, Footprints, LoaderCircle, Search, UserMinus, UserPlus, UsersRound, X } from 'lucide-react'
import { useCallback, useDeferredValue, useEffect, useMemo, useState, type FormEvent } from 'react'
import AvatarGroup from '../components/AvatarGroup'
import PremiumEmptyState from '../components/PremiumEmptyState'
import ProductHero from '../components/ProductHero'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { answerFriendRequest, friendProfileFor, loadFriendships, removeFriendship, searchProfiles, sendFriendRequest, type FriendProfile } from '../lib/friendships'
import type { Friendship } from '../types'
import UserAvatar from '../components/UserAvatar'

function ProfileAvatar({ profile, large = false }: { profile?: Pick<FriendProfile, 'display_name' | 'avatar_url'> | null; large?: boolean }) {
  return <UserAvatar className={`friend-avatar ${large ? 'friend-avatar-large' : ''}`} url={profile?.avatar_url} name={profile?.display_name}/>
}

type FriendPreview = Pick<FriendProfile, 'id' | 'display_name' | 'avatar_url'> & { bio?: string | null }

export default function FriendsPage() {
  const { user, stats, achievements } = useSocial()
  const { places } = usePlaces()
  const [friendships, setFriendships] = useState<Friendship[]>([])
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query.trim())
  const [results, setResults] = useState<FriendProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [openProfile, setOpenProfile] = useState<FriendPreview | null | undefined>(null)

  const load = useCallback(async () => {
    setError('')
    try { setFriendships(await loadFriendships()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Freunde konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const groups = useMemo(() => {
    if (!user) return { friends: [], incoming: [], outgoing: [] }
    return {
      friends: friendships.filter((item) => item.status === 'accepted'),
      incoming: friendships.filter((item) => item.status === 'pending' && item.addressee_id === user.id),
      outgoing: friendships.filter((item) => item.status === 'pending' && item.requester_id === user.id),
    }
  }, [friendships, user])
  const friendProfiles = useMemo(() => user ? groups.friends.map((item) => friendProfileFor(item, user.id)).filter((profile): profile is NonNullable<typeof profile> => Boolean(profile)) : [], [groups.friends, user])
  const communityPhotos = useMemo(() => places.reduce((sum, place) => sum + (place.photos_count || 0), 0), [places])
  const unlocked = achievements.filter((achievement) => achievement.unlocked)

  const runSearch = useCallback(async (value: string) => {
    if (!user || value.trim().length < 2) return
    setSearching(true); setError(''); setMessage('')
    try { setResults(await searchProfiles(value, user.id)) }
    catch { setError('Die Suche ist gerade nicht verfügbar.') }
    finally { setSearching(false) }
  }, [user])

  useEffect(() => {
    if (deferredQuery.length < 2) return
    const timeout = window.setTimeout(() => { void runSearch(deferredQuery) }, 220)
    return () => window.clearTimeout(timeout)
  }, [deferredQuery, runSearch])

  if (!user) return null

  const search = (event: FormEvent) => { event.preventDefault(); void runSearch(query) }
  const perform = async (id: string, action: () => Promise<void>, success: string) => {
    setBusyId(id); setError(''); setMessage('')
    try { await action(); setMessage(success); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Aktion fehlgeschlagen.') }
    finally { setBusyId('') }
  }
  const relatedIds = new Set(friendships.flatMap((item) => [item.requester_id, item.addressee_id]))
  relatedIds.delete(user.id)
  const visibleResults = query.trim().length >= 2 ? results : []

  return <div className="content-page friends-page social-product-page">
    <ProductHero
      className="community-product-hero"
      title="Zusammen wird draussen noch besser."
      description="Finde deine Community, teile echte Entdeckungen und sieh, welche Freunde schon unterwegs waren."
      aside={<AvatarGroup profiles={friendProfiles} label={groups.friends.length ? `${groups.friends.length} Freunde` : 'Dein Circle wartet'}/>} 
      metrics={[
        { label: 'Freunde', value: groups.friends.length, icon: <UsersRound/> },
        { label: 'Besuchte Orte', value: stats.visited, icon: <Footprints/> },
        { label: 'Ortsfotos', value: communityPhotos, icon: <Camera/> },
        { label: 'Eigene Orte', value: stats.places, icon: <Compass/> },
      ]}
    />

    <form className="friend-search friend-search-live" onSubmit={search}>
      <Search/>
      <label><span className="sr-only">Freunde nach Anzeigename suchen</span><input value={query} onChange={(event) => setQuery(event.target.value)} minLength={2} maxLength={40} autoComplete="off" placeholder="Explorer nach Anzeigename suchen…"/></label>
      {searching ? <LoaderCircle className="spin" aria-label="Suche läuft"/> : query && <button type="button" className="search-clear" onClick={() => { setQuery(''); setResults([]) }} aria-label="Suche leeren"><X/></button>}
      <button className="sr-only" type="submit">Suchen</button>
    </form>
    {message && <p className="community-photo-success" role="status">{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}

    {visibleResults.length > 0 && <section className="community-block search-results-block"><div className="community-heading"><div><h2>Explorer gefunden</h2><p>Echte Profile aus deiner ExplorerX-Community.</p></div><span>{visibleResults.length}</span></div><div className="people-grid people-grid-premium">{visibleResults.map((profile) => <article className="person-card person-card-premium" key={profile.id}><ProfileAvatar profile={profile} large/><div className="person-card-copy"><strong>{profile.display_name || 'Explorer'}</strong><p>{profile.bio || 'Dieses Profil hat noch keine Beschreibung.'}</p></div><button className="primary-button" disabled={busyId === profile.id || relatedIds.has(profile.id)} onClick={() => perform(profile.id, () => sendFriendRequest(profile.id), 'Freundschaftsanfrage gesendet.')}><UserPlus/>{relatedIds.has(profile.id) ? 'Bereits verbunden' : 'Anfragen'}</button></article>)}</div></section>}

    {!loading && groups.incoming.length > 0 && <section className="community-block requests-block"><div className="community-heading"><div><h2>Neue Anfragen</h2><p>Menschen, die gemeinsam mit dir entdecken möchten.</p></div><span>{groups.incoming.length}</span></div><div className="request-card-grid">{groups.incoming.map((item) => <article className="request-card" key={item.id}><ProfileAvatar profile={item.requester} large/><div><strong>{item.requester?.display_name || 'Explorer'}</strong><span>Möchte deinem Explorer Circle beitreten</span></div><div className="request-actions"><button className="accept" onClick={() => perform(item.id, () => answerFriendRequest(item.id, 'accepted'), 'Anfrage angenommen.')} disabled={busyId === item.id} aria-label="Anfrage annehmen"><Check/> Annehmen</button><button onClick={() => perform(item.id, () => answerFriendRequest(item.id, 'rejected'), 'Anfrage abgelehnt.')} disabled={busyId === item.id} aria-label="Anfrage ablehnen"><X/> Ablehnen</button></div></article>)}</div></section>}

    <div className="community-layout">
      <section className="community-block friends-showcase"><div className="community-heading"><div><h2>Meine Freunde</h2><p>Dein persönlicher Circle für neue Abenteuer.</p></div><span>{groups.friends.length}</span></div>{loading ? <div className="friend-card-skeletons"><span/><span/><span/></div> : groups.friends.length ? <div className="friend-card-grid">{groups.friends.map((item) => { const profile = friendProfileFor(item, user.id); return <article className="friend-profile-card" key={item.id}><div className="friend-profile-cover"/><ProfileAvatar profile={profile} large/><div className="friend-profile-copy"><strong>{profile?.display_name || 'Explorer'}</strong><span>Freund seit {new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(item.updated_at))}</span></div><div className="friend-profile-actions"><button className="profile-open" onClick={() => setOpenProfile(profile)}><Compass/> Profil öffnen</button><button className="danger-subtle" onClick={() => perform(item.id, () => removeFriendship(item.id), 'Freund entfernt.')} disabled={busyId === item.id} aria-label={`${profile?.display_name || 'Freund'} entfernen`}><UserMinus/></button></div></article> })}</div> : <PremiumEmptyState icon={<UsersRound/>} title="Dein Circle beginnt hier" description="Suche oben nach einem Anzeigenamen und sende deine erste Anfrage."/>}</section>

      <aside className="community-side-stack">
        <section className="community-block badge-showcase"><div className="community-heading"><div><h2>Deine Badges</h2><p>Echt verdient durch deine Aktivität.</p></div><Award/></div>{unlocked.length ? <div className="mini-badges">{unlocked.map((achievement) => <span key={achievement.id}><Award/><strong>{achievement.title}</strong></span>)}</div> : <PremiumEmptyState compact icon={<Award/>} title="Das erste Badge wartet" description="Entdecke oder teile deinen ersten echten Ort."/>}</section>
      </aside>
    </div>

    {groups.outgoing.length > 0 && <section className="outgoing-requests"><h2>Gesendete Anfragen</h2>{groups.outgoing.map((item) => <div key={item.id}><ProfileAvatar profile={item.addressee}/><span><strong>{item.addressee?.display_name || 'Explorer'}</strong><small>Antwort ausstehend</small></span><button onClick={() => perform(item.id, () => removeFriendship(item.id), 'Anfrage zurückgezogen.')} disabled={busyId === item.id} aria-label="Anfrage zurückziehen"><X/></button></div>)}</section>}

    {openProfile && <div className="profile-preview-backdrop" role="dialog" aria-modal="true" aria-label={`${openProfile.display_name || 'Explorer'} Profil`}><article className="profile-preview-card"><button className="preview-close" onClick={() => setOpenProfile(null)} aria-label="Profil schliessen"><X/></button><div className="profile-preview-cover"/><ProfileAvatar profile={openProfile} large/><h2>{openProfile.display_name || 'Explorer'}</h2><p>{openProfile.bio || 'Dieses Profil hat noch keine öffentliche Beschreibung.'}</p><button className="primary-button" onClick={() => setOpenProfile(null)}>Zurück zur Community <ChevronRight/></button></article></div>}
  </div>
}
