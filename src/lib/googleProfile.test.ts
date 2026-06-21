import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { Profile } from '../types'
import { googleProfileDefaults, syncGoogleProfile } from './googleProfile'

const googleUser = { id: 'user-1', user_metadata: { full_name: 'Google Explorer', avatar_url: 'https://example.com/avatar.jpg' } } as unknown as User

it('reads safe public profile defaults from Google metadata', () => {
  expect(googleProfileDefaults(googleUser)).toEqual({ display_name: 'Google Explorer', avatar_url: 'https://example.com/avatar.jpg' })
})

it('does not overwrite profile values chosen by the user', async () => {
  const existing = { id: 'user-1', display_name: 'Mein Name', avatar_url: 'https://example.com/custom.jpg' } as Profile
  const from = vi.fn()
  await expect(syncGoogleProfile({ from } as unknown as SupabaseClient, googleUser, existing)).resolves.toBe(existing)
  expect(from).not.toHaveBeenCalled()
})

it('creates a missing profile with Google defaults', async () => {
  const created = { id: 'user-1', ...googleProfileDefaults(googleUser) } as Profile
  const single = vi.fn().mockResolvedValue({ data: created, error: null })
  const select = vi.fn(() => ({ single }))
  const insert = vi.fn(() => ({ select }))
  const from = vi.fn(() => ({ insert }))
  await expect(syncGoogleProfile({ from } as unknown as SupabaseClient, googleUser, null)).resolves.toEqual(created)
  expect(insert).toHaveBeenCalledWith({ id: 'user-1', display_name: 'Google Explorer', avatar_url: 'https://example.com/avatar.jpg' })
})

it('fills only empty fields on an existing profile', async () => {
  const existing = { id: 'user-1', display_name: null, avatar_url: 'https://example.com/custom.jpg' } as Profile
  const updated = { ...existing, display_name: 'Google Explorer' }
  const single = vi.fn().mockResolvedValue({ data: updated, error: null })
  const select = vi.fn(() => ({ single }))
  const eq = vi.fn(() => ({ select }))
  const update = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ update }))
  await expect(syncGoogleProfile({ from } as unknown as SupabaseClient, googleUser, existing)).resolves.toEqual(updated)
  expect(update).toHaveBeenCalledWith({ display_name: 'Google Explorer' })
})
