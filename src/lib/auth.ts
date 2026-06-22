import type { SupabaseClient } from '@supabase/supabase-js'

export function friendlyAuthError(message: string) {
  const value = message.toLowerCase()
  if (value.includes('provider') && (value.includes('disabled') || value.includes('not enabled'))) return 'Google Login ist in Supabase noch nicht aktiviert.'
  if (value.includes('redirect') || value.includes('not allowed')) return 'Die Rücksprung-URL ist in Supabase nicht freigegeben.'
  if (value.includes('expired') || value.includes('invalid') || value.includes('code verifier')) return 'Die Google-Anmeldung ist abgelaufen oder ungültig. Bitte starte sie erneut.'
  if (value.includes('fetch') || value.includes('network') || value.includes('connection')) return 'Supabase ist gerade nicht erreichbar. Prüfe deine Verbindung und versuche es erneut.'
  if (value.includes('cancel') || value.includes('access_denied')) return 'Die Google-Anmeldung wurde abgebrochen.'
  return 'Google Login konnte nicht gestartet werden. Bitte versuche es erneut.'
}

export const oauthCallbackUrl = (origin: string) => new URL('/auth/callback', origin).toString()
const RETURN_TO_KEY = 'explorerx.auth.return-to'

export function rememberAuthReturnTo(value?: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login') || value.startsWith('/auth/callback')) return
  sessionStorage.setItem(RETURN_TO_KEY, value)
}

export function consumeAuthReturnTo() {
  const value = sessionStorage.getItem(RETURN_TO_KEY)
  sessionStorage.removeItem(RETURN_TO_KEY)
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/map'
}

export async function startGoogleOAuth(client: SupabaseClient, origin: string) {
  const { data, error } = await client.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: oauthCallbackUrl(origin) },
  })
  if (error) throw error
  return data
}

const callbackRequests = new Map<string, Promise<void>>()

export function completeOAuthCallback(client: SupabaseClient, href: string) {
  const existing = callbackRequests.get(href)
  if (existing) return existing

  const request = (async () => {
    const url = new URL(href)
    const authError = url.searchParams.get('error_description') || url.searchParams.get('error')
    if (authError) throw new Error(authError)

    const code = url.searchParams.get('code')
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code)
      if (error) throw error
    }

    const { data, error } = await client.auth.getSession()
    if (error) throw error
    if (!data.session) throw new Error('Keine gültige Session nach der Google-Anmeldung gefunden.')
  })()

  callbackRequests.set(href, request)
  void request.catch(() => callbackRequests.delete(href))
  return request
}

export async function signOutLocally(client: SupabaseClient) {
  const { error } = await client.auth.signOut({ scope: 'local' })
  if (error) throw error
}

export const technicalAuthError = (cause: unknown) => cause instanceof Error ? cause.message : 'Unbekannter Auth-Fehler'
