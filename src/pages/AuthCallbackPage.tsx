import { AlertCircle, LoaderCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { completeOAuthCallback, consumeAuthReturnTo, friendlyAuthError, technicalAuthError } from '../lib/auth'
import { supabase } from '../lib/supabase'

export default function AuthCallbackPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [technicalError, setTechnicalError] = useState('')

  useEffect(() => {
    let active = true

    if (!supabase) {
      void Promise.resolve().then(() => {
        if (active) setError('Supabase ist nicht konfiguriert.')
      })
      return () => { active = false }
    }
    completeOAuthCallback(supabase, window.location.href).then(() => {
      if (!active) return
      window.history.replaceState({}, document.title, '/auth/callback')
      navigate(consumeAuthReturnTo(), { replace: true })
    }).catch((cause) => {
      if (!active) return
      const details = technicalAuthError(cause)
      setTechnicalError(details)
      setError(friendlyAuthError(details))
    })
    return () => { active = false }
  }, [navigate])

  return <div className="auth-page"><section className="auth-card"><img className="auth-logo" src="/icons/icon-192.png" alt="ExplorerX"/><div className={`callback-status ${error ? 'callback-error' : ''}`}>{error ? <AlertCircle/> : <LoaderCircle className="spin"/>}</div><h1>{error ? 'Login nicht möglich' : 'Google Login wird abgeschlossen'}</h1>{error ? <><div className="auth-error-panel" role="alert"><p className="form-error">{error}</p>{technicalError && <details><summary>Technische Details</summary><code>{technicalError}</code></details>}</div><a className="primary-button" href="/login">Google Login erneut starten</a></> : <p role="status">Deine Session wird sicher eingerichtet…</p>}</section></div>
}
