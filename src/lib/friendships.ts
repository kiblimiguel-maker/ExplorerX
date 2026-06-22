import { supabase } from './supabase'
import type { Friendship, Profile } from '../types'

export type FriendProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url'> & { bio?: string | null }
export type FriendActivityKind = 'visit' | 'favorite' | 'photo'
export type FriendActivity = { id: string; kind: FriendActivityKind; user_id: string; place_id: string; created_at: string }

const requireClient = () => {
  if (!supabase) throw new Error('Freunde sind nur mit Supabase verfügbar.')
  return supabase
}

export async function loadFriendships(): Promise<Friendship[]> {
  const client = requireClient()
  const { data: rows, error } = await client.from('friendships').select('*').order('updated_at', { ascending: false })
  if (error) throw new Error('Freundschaften benötigen supabase/social_places.sql.')
  const ids = [...new Set((rows || []).flatMap((row) => [row.requester_id, row.addressee_id]))]
  const { data: profiles, error: profileError } = ids.length
    ? await client.from('users').select('id,display_name,avatar_url').in('id', ids)
    : { data: [], error: null }
  if (profileError) throw profileError
  const byId = new Map((profiles || []).map((profile) => [profile.id, profile]))
  return (rows || []).map((row) => ({
    ...row,
    requester: byId.get(row.requester_id) || null,
    addressee: byId.get(row.addressee_id) || null,
  })) as Friendship[]
}

export async function searchProfiles(query: string, ownUserId: string): Promise<FriendProfile[]> {
  const value = query.trim().replace(/[%_]/g, '')
  if (value.length < 2) return []
  const { data, error } = await requireClient().from('users').select('id,display_name,avatar_url,bio').neq('id', ownUserId).ilike('display_name', `%${value}%`).order('display_name').limit(12)
  if (error) throw error
  return (data || []) as FriendProfile[]
}

export async function loadProfile(profileId: string): Promise<FriendProfile | null> {
  const { data, error } = await requireClient().from('users').select('id,display_name,avatar_url,bio').eq('id', profileId).maybeSingle()
  if (error) throw error
  return data as FriendProfile | null
}

export async function loadFriendActivity(friendIds: string[]): Promise<FriendActivity[]> {
  if (!friendIds.length) return []
  const client = requireClient()
  const [visits, favorites, photos] = await Promise.all([
    client.from('visits').select('user_id,place_id,last_visited_at').in('user_id', friendIds).order('last_visited_at', { ascending: false }).limit(40),
    client.from('favorites').select('user_id,place_id,created_at').in('user_id', friendIds).order('created_at', { ascending: false }).limit(40),
    client.from('photos').select('id,uploaded_by,place_id,created_at').in('uploaded_by', friendIds).order('created_at', { ascending: false }).limit(40),
  ])
  if (visits.error) throw new Error('Besuche deiner Freunde konnten nicht geladen werden.')
  if (favorites.error) throw new Error('Gespeicherte Orte deiner Freunde benötigen supabase/friend_visit_visibility.sql.')
  if (photos.error) throw new Error('Community-Fotos konnten nicht geladen werden.')
  return [
    ...(visits.data || []).map((item) => ({ id: `visit:${item.user_id}:${item.place_id}`, kind: 'visit' as const, user_id: item.user_id, place_id: item.place_id, created_at: item.last_visited_at })),
    ...(favorites.data || []).map((item) => ({ id: `favorite:${item.user_id}:${item.place_id}`, kind: 'favorite' as const, user_id: item.user_id, place_id: item.place_id, created_at: item.created_at })),
    ...(photos.data || []).map((item) => ({ id: `photo:${item.id}`, kind: 'photo' as const, user_id: item.uploaded_by, place_id: item.place_id, created_at: item.created_at })),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at)).slice(0, 60)
}

export const friendInviteUrl = (origin: string, userId: string) => {
  const url = new URL('/friends', origin)
  url.searchParams.set('invite', userId)
  return url.toString()
}

export async function shareFriendInvite(url: string) {
  if (navigator.share) {
    await navigator.share({ title: 'ExplorerX', text: 'Lass uns gemeinsam echte Orte entdecken.', url })
    return 'shared' as const
  }
  await navigator.clipboard.writeText(url)
  return 'copied' as const
}

export async function sendFriendRequest(addresseeId: string) {
  const { data: auth } = await requireClient().auth.getUser()
  if (!auth.user) throw new Error('Bitte zuerst anmelden.')
  const { error } = await requireClient().from('friendships').insert({ requester_id: auth.user.id, addressee_id: addresseeId, status: 'pending' })
  if (error) throw new Error(error.code === '23505' ? 'Zwischen euch besteht bereits eine Anfrage oder Freundschaft.' : error.message.includes('rate') ? 'Zu viele Anfragen. Bitte versuche es morgen erneut.' : 'Anfrage konnte nicht gesendet werden.')
}

export async function answerFriendRequest(friendshipId: string, status: 'accepted' | 'rejected') {
  if (status === 'rejected') {
    const { data, error } = await requireClient().from('friendships').delete().eq('id', friendshipId).select('id').single()
    if (error || !data) throw new Error('Die Anfrage konnte nicht abgelehnt werden.')
    return
  }
  const { data, error } = await requireClient().from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', friendshipId).select('id').single()
  if (error || !data) throw new Error('Die Anfrage konnte nicht beantwortet werden.')
}

export async function removeFriendship(friendshipId: string) {
  const { data, error } = await requireClient().from('friendships').delete().eq('id', friendshipId).select('id').single()
  if (error || !data) throw new Error('Die Freundschaft konnte nicht entfernt werden.')
}

export const friendProfileFor = (friendship: Friendship, ownUserId: string) => friendship.requester_id === ownUserId ? friendship.addressee : friendship.requester
