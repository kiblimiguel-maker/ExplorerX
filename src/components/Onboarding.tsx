import { Bookmark, Compass, Flame, LocateFixed, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const ONBOARDING_KEY = 'explorerx.onboarding.v1'

export default function Onboarding() {
  const location = useLocation(); const navigate = useNavigate()
  const [open, setOpen] = useState(() => !localStorage.getItem(ONBOARDING_KEY))
  const [error, setError] = useState('')
  if (!open || !['/', '/map', '/discover'].includes(location.pathname)) return null
  const finish = () => { localStorage.setItem(ONBOARDING_KEY, 'done'); setOpen(false); navigate('/map') }
  const locate = () => {
    setError('')
    if (!navigator.geolocation) return setError('Standort ist in diesem Browser nicht verfügbar.')
    navigator.geolocation.getCurrentPosition((position) => {
      sessionStorage.setItem('explorerx.location', JSON.stringify({ latitude: position.coords.latitude, longitude: position.coords.longitude }))
      finish()
    }, () => setError('Standort wurde nicht freigegeben. Du kannst ExplorerX trotzdem nutzen.'))
  }
  const items = [[Compass, 'Entdecke besondere Orte'], [Bookmark, 'Speichere Favoriten'], [Flame, 'Sieh Trends'], [Plus, 'Teile eigene Orte']] as const
  return <div className="onboarding-backdrop" role="presentation"><section className="onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title"><button className="onboarding-close" onClick={finish} aria-label="Onboarding schliessen"><X/></button><img className="onboarding-logo" src="/icons/icon-192.png" alt="ExplorerX"/><h1 id="onboarding-title">Willkommen bei Explorer<span>X</span></h1><p>Deine Stadt steckt voller Orte, die du noch nicht kennst.</p><div className="onboarding-list">{items.map(([Icon, label]) => <div key={label}><span><Icon/></span><strong>{label}</strong></div>)}</div><button className="primary-button" onClick={finish}>ExplorerX starten</button><button className="location-choice" onClick={locate}><LocateFixed/> Orte in deiner Nähe anzeigen?</button>{error && <p className="form-error" role="alert">{error}</p>}</section></div>
}
