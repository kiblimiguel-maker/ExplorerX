import { supabase } from './supabase'
import type { Profile } from '../types'

export type CommunityProfile = Pick<Profile, 'id' | 'display_name' | 'avatar_url'>
export type PlaceCommunity = { contributors: CommunityProfile[]; friendVisitors: CommunityProfile[] }

export const formatFriendVisits = (profiles: CommunityProfile[]) => {
  const names = profiles.map((profile) => profile.display_name || 'Ein Freund')
  if (!names.length) return ''
  if (names.length === 1) return `${names[0]} war hier`
  if (names.length === 2) return `${names[0]} und ${names[1]} waren hier`
  return `${names[0]}, ${names[1]} und ${names.length - 2} weitere ${names.length - 2 === 1 ? 'Person war' : 'Personen waren'} hier`
}

export async function loadPlaceCommunity(placeId: string, ownUserId?: string): Promise<PlaceCommunity> {
  if (!supabase) return { contributors: [], friendVisitors: [] }
  const [photosResult, commentsResult, visitsResult] = await Promise.all([
    supabase.from('photos').select('uploaded_by').eq('place_id', placeId).order('created_at', { ascending: false }).limit(24),
    supabase.from('comments').select('user_id').eq('place_id', placeId).order('created_at', { ascending: false }).limit(24),
    supabase.from('visits').select('user_id').eq('place_id', placeId).order('last_visited_at', { ascending: false }).limit(50),
  ])
  const contributorIds = [...new Set([
    ...(photosResult.data || []).map((row) => row.uploaded_by),
    ...(commentsResult.data || []).map((row) => row.user_id),
    ...(visitsResult.data || []).map((row) => row.user_id),
  ])]
  if (!contributorIds.length) return { contributors: [], friendVisitors: [] }
  const { data, error } = await supabase.from('users').select('id,display_name,avatar_url').in('id', contributorIds)
  if (error) throw error
  const profiles = new Map((data || []).map((profile) => [profile.id, profile as CommunityProfile]))
  const friendIds = new Set((visitsResult.data || []).map((row) => row.user_id).filter((id) => id !== ownUserId))
  return {
    contributors: contributorIds.map((id) => profiles.get(id)).filter((profile): profile is CommunityProfile => Boolean(profile)).slice(0, 6),
    friendVisitors: [...friendIds].map((id) => profiles.get(id)).filter((profile): profile is CommunityProfile => Boolean(profile)),
  }
}
