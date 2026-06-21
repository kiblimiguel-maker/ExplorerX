import { AlertTriangle, CheckCircle2, EyeOff, Flag, Image, MessageSquare, RefreshCw, ShieldCheck, Trash2, UserRound, MapPin, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useSocial } from '../context/SocialContext'
import { deleteAdminComment, deleteAdminPhoto, deleteAdminPlace, hideAdminPlace, loadAdminDashboard, reviewAdminReport, type AdminDashboardData, type AdminPhoto } from '../lib/admin'

const formatDate = (value: string) => new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export default function AdminPage() {
  const { user } = useSocial()
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setData(await loadAdminDashboard()) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Admin-Daten konnten nicht geladen werden.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    let active = true
    loadAdminDashboard().then((result) => { if (active) setData(result) }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : 'Admin-Daten konnten nicht geladen werden.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  const run = async (id: string, action: () => Promise<void>, success: string) => {
    setActionId(id); setError(''); setMessage('')
    try { await action(); setMessage(success); await load() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Die Aktion konnte nicht ausgeführt werden.') }
    finally { setActionId('') }
  }
  const confirmAction = (question: string, action: () => void) => { if (window.confirm(question)) action() }
  const removePhoto = (photo: AdminPhoto) => confirmAction('Dieses Bild endgültig aus Galerie und Storage löschen?', () => { void run(`photo-${photo.id}`, () => deleteAdminPhoto(photo), 'Bild gelöscht.') })

  const stats: Array<{ label: string; count: number; icon: LucideIcon }> = [
    { label: 'Nutzer', count: data?.counts.users || 0, icon: UserRound },
    { label: 'Orte', count: data?.counts.places || 0, icon: MapPin },
    { label: 'Bilder', count: data?.counts.photos || 0, icon: Image },
    { label: 'Kommentare', count: data?.counts.comments || 0, icon: MessageSquare },
    { label: 'Reports', count: data?.counts.reports || 0, icon: Flag },
  ]

  return <div className="admin-page content-page">
    <header className="admin-header"><div><span className="admin-kicker"><ShieldCheck/> Geschützter Bereich</span><h1>Moderation</h1><p>Community-Inhalte prüfen und ExplorerX sicher halten.</p></div><button className="secondary-button" onClick={() => void load()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''}/> Aktualisieren</button></header>
    <div className="admin-warning"><AlertTriangle/><div><strong>Aktionen wirken sofort.</strong><span>Gelöschte Orte entfernen auch Likes, Favoriten, Kommentare, Reports und Besuche. Prüfe Inhalte sorgfältig.</span></div></div>
    {message && <p className="admin-message" role="status"><CheckCircle2/>{message}</p>}
    {error && <p className="form-error admin-error" role="alert">{error}</p>}
    {loading && !data ? <div className="admin-loading" role="status"><RefreshCw className="spin"/> Adminbereich wird geladen…</div> : data && <>
      <section className="admin-stats" aria-label="Statistiken">
        {stats.map(({ label, count, icon: Icon }) => <article key={label}><Icon/><span>{label}</span><strong>{count}</strong></article>)}
      </section>

      <div className="admin-grid">
        <section className="admin-panel admin-reports"><div className="admin-panel-heading"><div><Flag/><h2>Gemeldete Orte</h2></div><span>{data.reports.filter((report) => report.status === 'open').length} offen</span></div>
          {data.reports.length ? <div className="admin-list">{data.reports.map((report) => <article className="admin-report" key={report.id}><div><span className={`admin-status status-${report.status}`}>{report.status === 'open' ? 'Offen' : report.status === 'reviewed' ? 'Geprüft' : 'Abgewiesen'}</span><strong>{report.place?.name || 'Gelöschter Ort'}</strong><p>{report.reason}</p><small>{formatDate(report.created_at)}</small></div><div className="admin-actions">{report.status === 'open' && <button onClick={() => void run(`report-${report.id}`, () => reviewAdminReport(report.id, user!.id), 'Report als geprüft markiert.')} disabled={Boolean(actionId)}><CheckCircle2/> Prüfen</button>}{report.place && <button onClick={() => confirmAction(`„${report.place?.name}“ für alle Nutzer ausblenden?`, () => { void run(`hide-${report.place_id}`, () => hideAdminPlace(report.place_id), 'Ort ausgeblendet.') })} disabled={Boolean(actionId)}><EyeOff/> Ausblenden</button>}</div></article>)}</div> : <div className="admin-empty"><ShieldCheck/><strong>Keine Reports</strong><span>Aktuell gibt es nichts zu prüfen.</span></div>}
        </section>

        <section className="admin-panel"><div className="admin-panel-heading"><div><MapPin/><h2>Neueste Orte</h2></div></div><div className="admin-list">{data.places.map((place) => <article className="admin-place" key={place.id}>{place.image_url ? <img src={place.image_url} alt=""/> : <div className="admin-thumb"><MapPin/></div>}<div><strong>{place.name}</strong><span>{place.category} · {place.status}</span><small>{formatDate(place.created_at)}</small></div><div className="admin-actions"><button onClick={() => confirmAction(`„${place.name}“ für alle Nutzer ausblenden?`, () => { void run(`hide-${place.id}`, () => hideAdminPlace(place.id), 'Ort ausgeblendet.') })} disabled={place.status === 'hidden' || Boolean(actionId)}><EyeOff/> Ausblenden</button><button className="danger" onClick={() => confirmAction(`„${place.name}“ endgültig löschen? Diese Aktion kann nicht rückgängig gemacht werden.`, () => { void run(`place-${place.id}`, () => deleteAdminPlace(place.id), 'Ort endgültig gelöscht.') })} disabled={Boolean(actionId)}><Trash2/> Löschen</button></div></article>)}</div></section>

        <section className="admin-panel"><div className="admin-panel-heading"><div><MessageSquare/><h2>Neueste Kommentare</h2></div></div>{data.comments.length ? <div className="admin-list">{data.comments.map((comment) => <article className="admin-comment" key={comment.id}><div><strong>{comment.author?.display_name || 'Explorer'}</strong><span>bei {comment.place?.name || 'gelöschtem Ort'}</span><p>{comment.body}</p><small>{formatDate(comment.created_at)}</small></div><button className="icon-danger" aria-label="Kommentar löschen" onClick={() => confirmAction('Diesen Kommentar endgültig löschen?', () => { void run(`comment-${comment.id}`, () => deleteAdminComment(comment.id), 'Kommentar gelöscht.') })} disabled={Boolean(actionId)}><Trash2/></button></article>)}</div> : <div className="admin-empty"><MessageSquare/><strong>Keine Kommentare</strong></div>}</section>

        <section className="admin-panel"><div className="admin-panel-heading"><div><Image/><h2>Neueste Bilder</h2></div></div>{data.photos.length ? <div className="admin-photo-grid">{data.photos.map((photo) => <article key={photo.id}><img src={photo.public_url} alt={photo.place?.name || 'Ortsbild'} loading="lazy"/><div><strong>{photo.place?.name || 'Unbekannter Ort'}</strong><small>{formatDate(photo.created_at)}</small></div><button aria-label="Bild löschen" onClick={() => removePhoto(photo)} disabled={Boolean(actionId)}><Trash2/></button></article>)}</div> : <div className="admin-empty"><Image/><strong>Keine Bilder</strong></div>}</section>
      </div>
    </>}
  </div>
}
