import { Check, MessageCircle, Pencil, Send, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import type { Comment } from '../types'
import UserAvatar from './UserAvatar'
import { useSocial } from '../context/SocialContext'

const demoKey = (placeId: string) => `explorerx.comments.v2.${placeId}`
const readDemo = (placeId: string) => { try { return JSON.parse(localStorage.getItem(demoKey(placeId)) || '[]') as Comment[] } catch { return [] } }
const relativeTime = (value: string) => {
  const minutes = Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  const formatter = new Intl.RelativeTimeFormat('de', { numeric: 'auto' })
  if (minutes < 60) return formatter.format(-minutes, 'minute')
  const hours = Math.round(minutes / 60)
  if (hours < 24) return formatter.format(-hours, 'hour')
  return formatter.format(-Math.round(hours / 24), 'day')
}

export default function Comments({ placeId, onCountChange }: { placeId: string; onCountChange?: (delta: number) => void }) {
  const { user, profile } = useSocial()
  const [comments, setComments] = useState<Comment[]>([])
  const [body, setBody] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingBody, setEditingBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!supabase) { await Promise.resolve(); setComments(readDemo(placeId)); setLoading(false); return }
    const { data, error: loadError } = await supabase.from('comments').select('*, author:users(display_name, avatar_url)').eq('place_id', placeId).order('created_at', { ascending: false }).limit(50)
    if (loadError) setError('Kommentare werden nach dem Ausführen von supabase/v2_migration.sql verfügbar.')
    else setComments((data || []) as Comment[])
    setLoading(false)
  }, [placeId])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('')
    const value = body.trim()
    if (value.length < 2 || value.length > 500) return setError('Kommentare müssen 2 bis 500 Zeichen lang sein.')
    if (supabase && !user) return setError('Bitte melde dich an, um zu kommentieren.')
    setBusy(true)
    if (supabase && user) {
      const { data, error: insertError } = await supabase.from('comments').insert({ place_id: placeId, user_id: user.id, body: value }).select('*, author:users(display_name, avatar_url)').single()
      if (insertError) setError(insertError.message.includes('rate') ? 'Zu viele Kommentare. Bitte warte kurz.' : 'Kommentar konnte nicht gespeichert werden.')
      else { setComments((current) => [data as Comment, ...current]); setBody(''); onCountChange?.(1) }
    } else {
      const comment: Comment = { id: crypto.randomUUID(), place_id: placeId, user_id: 'local-user', body: value, created_at: new Date().toISOString(), edited_at: null, author: { display_name: 'Du (lokal)', avatar_url: null } }
      const next = [comment, ...comments]; setComments(next); localStorage.setItem(demoKey(placeId), JSON.stringify(next)); setBody(''); onCountChange?.(1)
    }
    setBusy(false)
  }

  const saveEdit = async (comment: Comment) => {
    const value = editingBody.trim(); if (value.length < 2 || value.length > 500) return setError('Kommentare müssen 2 bis 500 Zeichen lang sein.')
    if (supabase) { const { error: editError } = await supabase.from('comments').update({ body: value, edited_at: new Date().toISOString() }).eq('id', comment.id).eq('user_id', user?.id || ''); if (editError) return setError('Änderung konnte nicht gespeichert werden.') }
    const next = comments.map((item) => item.id === comment.id ? { ...item, body: value, edited_at: new Date().toISOString() } : item); setComments(next); if (!supabase) localStorage.setItem(demoKey(placeId), JSON.stringify(next)); setEditingId(null)
  }

  const remove = async (comment: Comment) => {
    if (supabase) { const { error: removeError } = await supabase.from('comments').delete().eq('id', comment.id).eq('user_id', user?.id || ''); if (removeError) return setError('Kommentar konnte nicht gelöscht werden.') }
    const next = comments.filter((item) => item.id !== comment.id); setComments(next); if (!supabase) localStorage.setItem(demoKey(placeId), JSON.stringify(next)); onCountChange?.(-1)
  }

  const ownId = user?.id || (!supabase ? 'local-user' : '')
  return <section className="comments-panel">
    <div className="comments-heading"><div><MessageCircle/><h2>Kommentare</h2></div><span>{comments.length}</span></div>
    <form className="comment-form" onSubmit={submit}><UserAvatar className="small" url={profile?.avatar_url} name={profile?.display_name}/><label><span className="sr-only">Kommentar</span><textarea value={body} onChange={(event) => setBody(event.target.value)} maxLength={500} placeholder="Was sollten andere über diesen Ort wissen?" rows={2}/></label><button className="primary-button icon-button" disabled={busy} aria-label="Kommentar senden"><Send size={18}/></button></form>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <div className="comment-loading"><span/><span/><span/></div> : comments.length ? <div className="comment-list">{comments.map((comment) => <article className="comment" key={comment.id}><UserAvatar className="small" url={comment.author?.avatar_url} name={comment.author?.display_name}/><div><div className="comment-meta"><strong>{comment.author?.display_name || 'Explorer'}</strong><time dateTime={comment.created_at}>{relativeTime(comment.created_at)}</time>{comment.edited_at && <span>bearbeitet</span>}</div>{editingId === comment.id ? <div className="comment-edit"><textarea value={editingBody} onChange={(event) => setEditingBody(event.target.value)} maxLength={500}/><button onClick={() => saveEdit(comment)} aria-label="Änderung speichern"><Check/></button><button onClick={() => setEditingId(null)} aria-label="Bearbeiten abbrechen"><X/></button></div> : <p>{comment.body}</p>}</div>{comment.user_id === ownId && editingId !== comment.id && <div className="comment-actions"><button onClick={() => { setEditingId(comment.id); setEditingBody(comment.body) }} aria-label="Kommentar bearbeiten"><Pencil/></button><button onClick={() => remove(comment)} aria-label="Kommentar löschen"><Trash2/></button></div>}</article>)}</div> : <div className="empty-comment">Noch keine Kommentare. Starte die Unterhaltung.</div>}
  </section>
}
