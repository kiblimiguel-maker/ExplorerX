import { CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { friendlyAuthError, startGoogleOAuth, technicalAuthError } from '../lib/auth'
import { isSupabaseConfigured, missingSupabaseVariables, supabase } from '../lib/supabase'

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z"/><path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6 6 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.63.39 3.17 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
}

export default function AuthPage() {
  const [error, setError] = useState('')
  const [technicalError, setTechnicalError] = useState('')
  const [loading, setLoading] = useState(false)

  const loginWithGoogle = async () => {
    setError(''); setTechnicalError('')
    if (!supabase) {
      setError(`Supabase ist nicht konfiguriert. Es fehlen: ${missingSupabaseVariables.join(', ')}.`)
      return
    }
    setLoading(true)
    try {
      await startGoogleOAuth(supabase, window.location.origin)
    } catch (cause) {
      const details = technicalAuthError(cause)
      setError(friendlyAuthError(details))
      setTechnicalError(details)
      setLoading(false)
    }
  }

  return <div className="auth-page"><div className="auth-atmosphere" aria-hidden="true"><img src="/icons/icon-512.png" alt=""/></div><section className="auth-card auth-card-wide">
    <img className="auth-logo" src="/icons/icon-192.png" alt="ExplorerX"/>
    <h1>Dein nächstes Abenteuer beginnt hier.</h1><p className="auth-lead">Melde dich sicher an und entdecke echte Orte aus der Community.</p>
    {!isSupabaseConfigured ? <><p className="form-error" role="alert">Supabase ist nicht konfiguriert. Es fehlen: {missingSupabaseVariables.join(', ')}.</p><div className="demo-note"><CheckCircle2 size={18}/> Login ist erst nach dem Setzen der Umgebungsvariablen verfügbar.</div></> : <div className="login-options google-login-options">
      <button type="button" className="google-login-button" onClick={loginWithGoogle} disabled={loading}><GoogleIcon/><span>{loading ? 'Google wird geöffnet…' : 'Mit Google anmelden'}</span></button>
      <p className="oauth-note">Du wirst kurz zu Google weitergeleitet und danach sicher zu ExplorerX zurückgebracht.</p>
    </div>}
    {error && <div className="auth-error-panel" role="alert"><p className="form-error">{error}</p>{technicalError && <details><summary>Technische Details</summary><code>{technicalError}</code></details>}</div>}
    <small>Nach erfolgreichem Login geht es direkt zur Karte. Deine Session bleibt nach einem Reload erhalten.</small>
  </section></div>
}
