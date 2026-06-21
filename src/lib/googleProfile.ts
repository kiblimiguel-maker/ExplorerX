import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Profile } from '../types'

const profileName = (user: User) => {
  const value = [user.user_metadata.full_name, user.user_metadata.name].find((item) => typeof item === 'string')?.trim()
  if (!value || value.length < 2) return null
  return value.slice(0, 40)
}

const profileAvatar = (user: User) => {
  const value = [user.user_metadata.avatar_url, user.user_metadata.picture].find((item) => typeof item === 'string')?.trim()
  return value?.startsWith('https://') ? value : null
}

export function googleProfileDefaults(user: User) {
  return { display_name: profileName(user), avatar_url: profileAvatar(user) }
}

export async function syncGoogleProfile(client: SupabaseClient, user: User, existing: Profile | null) {
  const defaults = googleProfileDefaults(user)
  if (!existing) {
    const { data, error } = await client.from('users').insert({ id: user.id, ...defaults }).select().single()
    if (!error) return data as Profile
    if (error.code !== '23505') throw error
    const retry = await client.from('users').select('*').eq('id', user.id).single()
    if (retry.error) throw retry.error
    return retry.data as Profile
  }

  const changes: Partial<Pick<Profile, 'display_name' | 'avatar_url'>> = {}
  if (!existing.display_name && defaults.display_name) changes.display_name = defaults.display_name
  if (!existing.avatar_url && defaults.avatar_url) changes.avatar_url = defaults.avatar_url
  if (!Object.keys(changes).length) return existing

  const { data, error } = await client.from('users').update(changes).eq('id', user.id).select().single()
  if (error) throw error
  return data as Profile
}
