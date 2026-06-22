import type { User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Achievement, Profile, ProfileStats } from '../types'
import { achievementsFor } from '../lib/achievements'
import { signOutLocally } from '../lib/auth'
import { syncGoogleProfile } from '../lib/googleProfile'
import { useOptionalPlaces } from './PlacesContext'

type SocialContextValue = {
  user: User | null
  profile: Profile | null
  stats: ProfileStats
  achievements: Achievement[]
  favoriteIds: Set<string>
  visitedIds: Set<string>
  friendVisitCounts: Map<string, number>
  friendVisitorsByPlace: Map<string, Array<Pick<Profile, 'id' | 'display_name' | 'avatar_url'>>>
  isAdmin: boolean
  isLoading: boolean
  message: string
  clearMessage: () => void
  toggleFavorite: (placeId: string) => Promise<void>
  toggleVisit: (placeId: string) => Promise<void>
  updateProfile: (displayName: string, bio: string, avatar?: File) => Promise<void>
  signOut: () => Promise<void>
}

const SocialContext = createContext<SocialContextValue | null>(null)
const EMPTY_STATS = { places: 0, likesReceived: 0, visited: 0 }
const readDemoFavorites = () => {
  try { return new Set<string>(JSON.parse(localStorage.getItem('explorerx.favorites.v2') || '[]')) } catch { return new Set<string>() }
}
const readDemoVisits = () => {
  try { return new Set<string>(JSON.parse(localStorage.getItem('explorerx.visits.v2') || '[]')) } catch { return new Set<string>() }
}

export function SocialProvider({ children }: { children: ReactNode }) {
  const placesContext = useOptionalPlaces()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<ProfileStats>(EMPTY_STATS)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => readDemoFavorites())
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => readDemoVisits())
  const [friendVisitCounts, setFriendVisitCounts] = useState<Map<string, number>>(new Map())
  const [friendVisitorsByPlace, setFriendVisitorsByPlace] = useState<Map<string, Array<Pick<Profile, 'id' | 'display_name' | 'avatar_url'>>>>(new Map())
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [message, setMessage] = useState('')

  const loadAccount = useCallback(async (nextUser: User | null) => {
    setUser(nextUser)
    setProfile(null)
    setIsAdmin(false)
    if (!supabase || !nextUser) {
      setStats(EMPTY_STATS)
      if (supabase) { setFavoriteIds(new Set()); setVisitedIds(new Set()); setFriendVisitCounts(new Map()); setFriendVisitorsByPlace(new Map()) }
      setIsLoading(false)
      return
    }
    const [profileResult, favoritesResult, placesResult, visitsResult, friendVisitsResult, adminResult] = await Promise.all([
      supabase.from('users').select('*').eq('id', nextUser.id).maybeSingle(),
      supabase.from('favorites').select('place_id').eq('user_id', nextUser.id),
      supabase.from('places').select('likes_count').eq('created_by', nextUser.id),
      supabase.from('visits').select('place_id').eq('user_id', nextUser.id),
      supabase.from('visits').select('place_id,user_id').neq('user_id', nextUser.id),
      supabase.from('admin_users').select('user_id').eq('user_id', nextUser.id).maybeSingle(),
    ])
    let nextProfile = profileResult.data ? profileResult.data as Profile : null
    try {
      nextProfile = await syncGoogleProfile(supabase, nextUser, nextProfile)
    } catch {
      setMessage('Dein Google-Profil konnte nicht vollständig übernommen werden. Du kannst es unter Profil ergänzen.')
    }
    setProfile(nextProfile)
    setFavoriteIds(new Set((favoritesResult.data || []).map((item) => item.place_id)))
    setVisitedIds(new Set((visitsResult.data || []).map((item) => item.place_id)))
    const nextFriendVisits = new Map<string, number>()
    for (const visit of friendVisitsResult.data || []) nextFriendVisits.set(visit.place_id, (nextFriendVisits.get(visit.place_id) || 0) + 1)
    setFriendVisitCounts(nextFriendVisits)
    const friendIds = [...new Set((friendVisitsResult.data || []).map((visit) => visit.user_id))]
    const { data: friendProfiles } = friendIds.length
      ? await supabase.from('users').select('id,display_name,avatar_url').in('id', friendIds)
      : { data: [] }
    const profilesById = new Map((friendProfiles || []).map((item) => [item.id, item]))
    const nextVisitors = new Map<string, Array<Pick<Profile, 'id' | 'display_name' | 'avatar_url'>>>()
    for (const visit of friendVisitsResult.data || []) {
      const visitor = profilesById.get(visit.user_id)
      if (visitor) nextVisitors.set(visit.place_id, [...(nextVisitors.get(visit.place_id) || []), visitor])
    }
    setFriendVisitorsByPlace(nextVisitors)
    const ownPlaces = placesResult.data || []
    setStats({ places: ownPlaces.length, likesReceived: ownPlaces.reduce((sum, item) => sum + item.likes_count, 0), visited: visitsResult.data?.length || 0 })
    setIsAdmin(Boolean(adminResult.data && !adminResult.error))
    setIsLoading(false)
  }, [])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => loadAccount(data.session?.user || null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void loadAccount(session?.user || null) }, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [loadAccount])

  useEffect(() => { if (!supabase) localStorage.setItem('explorerx.favorites.v2', JSON.stringify([...favoriteIds])) }, [favoriteIds])
  useEffect(() => { if (!supabase) localStorage.setItem('explorerx.visits.v2', JSON.stringify([...visitedIds])) }, [visitedIds])

  const toggleFavorite = useCallback(async (placeId: string) => {
    const saved = favoriteIds.has(placeId)
    if (!supabase) {
      setFavoriteIds((current) => { const next = new Set(current); if (next.has(placeId)) next.delete(placeId); else next.add(placeId); localStorage.setItem('explorerx.favorites.v2', JSON.stringify([...next])); return next })
      return
    }
    if (!user) { setMessage('Melde dich an, um Favoriten zu speichern.'); return }
    const result = saved
      ? await supabase.from('favorites').delete().eq('user_id', user.id).eq('place_id', placeId)
      : await supabase.from('favorites').insert({ user_id: user.id, place_id: placeId })
    if (result.error) { setMessage('Favoriten benötigen das ExplorerX-v2-Datenbankschema.'); return }
    setFavoriteIds((current) => { const next = new Set(current); if (saved) next.delete(placeId); else next.add(placeId); return next })
    placesContext?.adjustSocialCount(placeId, 'favorites_count', saved ? -1 : 1)
  }, [favoriteIds, placesContext, user])

  const toggleVisit = useCallback(async (placeId: string) => {
    const visited = visitedIds.has(placeId)
    if (!supabase) {
      setVisitedIds((current) => { const next = new Set(current); if (visited) next.delete(placeId); else next.add(placeId); return next })
      setStats((current) => ({ ...current, visited: Math.max(0, current.visited + (visited ? -1 : 1)) }))
      placesContext?.adjustSocialCount(placeId, 'visits_count', visited ? -1 : 1)
      return
    }
    if (!user) { setMessage('Melde dich an, um einen Besuch zu markieren.'); return }
    const result = visited
      ? await supabase.from('visits').delete().eq('user_id', user.id).eq('place_id', placeId)
      : await supabase.from('visits').insert({ user_id: user.id, place_id: placeId })
    if (result.error) { setMessage('„War hier“ benötigt supabase/social_places.sql.'); return }
    setVisitedIds((current) => { const next = new Set(current); if (visited) next.delete(placeId); else next.add(placeId); return next })
    setStats((current) => ({ ...current, visited: Math.max(0, current.visited + (visited ? -1 : 1)) }))
    placesContext?.adjustSocialCount(placeId, 'visits_count', visited ? -1 : 1)
    setMessage(visited ? 'Besuch entfernt.' : 'Als besucht markiert.')
  }, [placesContext, user, visitedIds])

  const updateProfile = useCallback(async (displayName: string, bio: string, avatar?: File) => {
    if (!supabase || !user) throw new Error('Bitte zuerst anmelden.')
    let avatarUrl = profile?.avatar_url || null
    if (avatar) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(avatar.type) || avatar.size > 2_000_000) throw new Error('Profilbilder müssen JPG, PNG oder WebP und höchstens 2 MB gross sein.')
      const ext = avatar.name.split('.').pop()?.toLowerCase() || 'webp'
      const path = `${user.id}/avatar.${ext}`
      const { error } = await supabase.storage.from('avatars').upload(path, avatar, { upsert: true, contentType: avatar.type })
      if (error) throw error
      avatarUrl = `${supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl}?v=${Date.now()}`
    }
    const { data, error } = await supabase.from('users').update({ display_name: displayName.trim(), bio: bio.trim() || null, avatar_url: avatarUrl }).eq('id', user.id).select().single()
    if (error) throw error
    setProfile(data as Profile)
    setMessage('Profil gespeichert.')
  }, [profile?.avatar_url, user])

  const achievements = useMemo<Achievement[]>(() => achievementsFor(stats), [stats])

  const signOut = useCallback(async () => {
    if (supabase) await signOutLocally(supabase)
    await loadAccount(null)
  }, [loadAccount])

  const value = useMemo(() => ({ user, profile, stats, achievements, favoriteIds, visitedIds, friendVisitCounts, friendVisitorsByPlace, isAdmin, isLoading, message, clearMessage: () => setMessage(''), toggleFavorite, toggleVisit, updateProfile, signOut }), [achievements, favoriteIds, friendVisitCounts, friendVisitorsByPlace, isAdmin, isLoading, message, profile, signOut, stats, toggleFavorite, toggleVisit, updateProfile, user, visitedIds])
  return <SocialContext.Provider value={value}>{children}</SocialContext.Provider>
}

export function useSocial() {
  const value = useContext(SocialContext)
  if (!value) throw new Error('useSocial must be used within SocialProvider')
  return value
}
