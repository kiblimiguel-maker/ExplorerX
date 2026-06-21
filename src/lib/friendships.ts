import { supabase } from './supabase'
import type { Friendship, Profile } from '../types'

export type FriendProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url' | 'bio'>

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

export async function sendFriendRequest(addresseeId: string) {
  const { data: auth } = await requireClient().auth.getUser()
  if (!auth.user) throw new Error('Bitte zuerst anmelden.')
  const { error } = await requireClient().from('friendships').insert({ requester_id: auth.user.id, addressee_id: addresseeId, status: 'pending' })
  if (error) throw new Error(error.code === '23505' ? 'Zwischen euch besteht bereits eine Anfrage oder Freundschaft.' : error.message.includes('rate') ? 'Zu viele Anfragen. Bitte versuche es morgen erneut.' : 'Anfrage konnte nicht gesendet werden.')
}

export async function answerFriendRequest(friendshipId: string, status: 'accepted' | 'rejected') {
  const { data, error } = await requireClient().from('friendships').update({ status, updated_at: new Date().toISOString() }).eq('id', friendshipId).select('id').single()
  if (error || !data) throw new Error('Die Anfrage konnte nicht beantwortet werden.')
}

export async function removeFriendship(friendshipId: string) {
  const { data, error } = await requireClient().from('friendships').delete().eq('id', friendshipId).select('id').single()
  if (error || !data) throw new Error('Die Freundschaft konnte nicht entfernt werden.')
}

export const friendProfileFor = (friendship: Friendship, ownUserId: string) => friendship.requester_id === ownUserId ? friendship.addressee : friendship.requester
