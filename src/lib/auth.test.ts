import type { SupabaseClient } from '@supabase/supabase-js'
import { completeOAuthCallback, friendlyAuthError, oauthCallbackUrl, signOutLocally, startGoogleOAuth } from './auth'

const clientWith = (auth: Record<string, unknown>) => ({ auth }) as unknown as SupabaseClient

describe('Google OAuth helpers', () => {
  it('explains disabled providers', () => expect(friendlyAuthError('Provider is not enabled')).toContain('nicht aktiviert'))
  it('builds the callback URL from the current origin', () => expect(oauthCallbackUrl('http://127.0.0.1:5173')).toBe('http://127.0.0.1:5173/auth/callback'))

  it('starts Google OAuth with the exact callback URL', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: { url: 'https://accounts.google.com/' }, error: null })
    await startGoogleOAuth(clientWith({ signInWithOAuth }), 'http://localhost:5173')
    expect(signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'http://localhost:5173/auth/callback' } })
  })

  it('surfaces OAuth start errors', async () => {
    const signInWithOAuth = vi.fn().mockResolvedValue({ data: null, error: new Error('Provider is not enabled') })
    await expect(startGoogleOAuth(clientWith({ signInWithOAuth }), 'http://localhost:5173')).rejects.toThrow('Provider is not enabled')
  })

  it('exchanges a PKCE code and verifies the persisted session once', async () => {
    const exchangeCodeForSession = vi.fn().mockResolvedValue({ error: null })
    const getSession = vi.fn().mockResolvedValue({ data: { session: { access_token: 'session' } }, error: null })
    const client = clientWith({ exchangeCodeForSession, getSession })
    const href = 'http://127.0.0.1:5173/auth/callback?code=google-pkce-code'
    const first = completeOAuthCallback(client, href)
    const second = completeOAuthCallback(client, href)
    expect(first).toBe(second)
    await Promise.all([first, second])
    expect(exchangeCodeForSession).toHaveBeenCalledTimes(1)
    expect(exchangeCodeForSession).toHaveBeenCalledWith('google-pkce-code')
    expect(getSession).toHaveBeenCalledTimes(1)
  })

  it('shows OAuth callback errors without exchanging a code', async () => {
    const exchangeCodeForSession = vi.fn()
    await expect(completeOAuthCallback(clientWith({ exchangeCodeForSession }), 'http://localhost:5173/auth/callback?error=access_denied')).rejects.toThrow('access_denied')
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it('logs out the local browser session', async () => {
    const signOut = vi.fn().mockResolvedValue({ error: null })
    await signOutLocally(clientWith({ signOut }))
    expect(signOut).toHaveBeenCalledWith({ scope: 'local' })
  })
})
