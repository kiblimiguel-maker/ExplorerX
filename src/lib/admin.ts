import { supabase } from './supabase'
import type { Place } from '../types'

export type AdminComment = { id: string; body: string; created_at: string; user_id: string; author: { display_name: string | null } | null; place: { id: string; name: string } | null }
export type AdminReport = { id: string; reason: string; status: 'open' | 'reviewed' | 'dismissed'; created_at: string; place_id: string; place: { id: string; name: string; status: Place['status'] } | null }
export type AdminPhoto = { id: string; place_id: string; storage_path: string; created_at: string; place: { id: string; name: string; image_url?: string } | null; public_url: string }
export type AdminDashboardData = {
  counts: { users: number; places: number; photos: number; comments: number; reports: number }
  places: Place[]
  comments: AdminComment[]
  reports: AdminReport[]
  photos: AdminPhoto[]
}

const client = () => {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  return supabase
}
const fail = (message: string, error?: { message?: string } | null) => { throw new Error(error?.message || message) }

export async function loadAdminDashboard(): Promise<AdminDashboardData> {
  const db = client()
  const [usersCount, placesCount, photosCount, commentsCount, reportsCount, placesResult, commentsResult, reportsResult, photosResult] = await Promise.all([
    db.from('users').select('id', { count: 'exact', head: true }),
    db.from('places').select('id', { count: 'exact', head: true }),
    db.from('photos').select('id', { count: 'exact', head: true }),
    db.from('comments').select('id', { count: 'exact', head: true }),
    db.from('reports').select('id', { count: 'exact', head: true }),
    db.from('places').select('*').order('created_at', { ascending: false }).limit(12),
    db.from('comments').select('id,body,created_at,user_id,author:users(display_name),place:places(id,name)').order('created_at', { ascending: false }).limit(12),
    db.from('reports').select('id,reason,status,created_at,place_id,place:places(id,name,status)').order('created_at', { ascending: false }).limit(30),
    db.from('photos').select('id,place_id,storage_path,created_at,place:places(id,name,image_url)').order('created_at', { ascending: false }).limit(20),
  ])
  const firstError = [usersCount, placesCount, photosCount, commentsCount, reportsCount, placesResult, commentsResult, reportsResult, photosResult].find((result) => result.error)?.error
  if (firstError) fail('Admin-Daten konnten nicht geladen werden.', firstError)
  const photos = (photosResult.data || []).map((photo) => ({ ...photo, public_url: db.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl })) as unknown as AdminPhoto[]
  return {
    counts: { users: usersCount.count || 0, places: placesCount.count || 0, photos: photosCount.count || 0, comments: commentsCount.count || 0, reports: reportsCount.count || 0 },
    places: (placesResult.data || []) as Place[],
    comments: (commentsResult.data || []) as unknown as AdminComment[],
    reports: (reportsResult.data || []) as unknown as AdminReport[],
    photos,
  }
}

export async function hideAdminPlace(placeId: string) {
  const { data, error } = await client().from('places').update({ status: 'hidden' }).eq('id', placeId).select('id').single()
  if (error || !data) fail('Der Ort konnte nicht ausgeblendet werden.', error)
}

export async function deleteAdminPlace(placeId: string) {
  const db = client()
  const { data: photoRows, error: photoError } = await db.from('photos').select('storage_path').eq('place_id', placeId)
  if (photoError) fail('Die zugehörigen Bilder konnten nicht geprüft werden.', photoError)
  const { data, error } = await db.from('places').delete().eq('id', placeId).select('id').single()
  if (error || !data) fail('Der Ort konnte nicht gelöscht werden.', error)
  const paths = (photoRows || []).map((photo) => photo.storage_path)
  if (paths.length) {
    const { error: storageError } = await db.storage.from('place-photos').remove(paths)
    if (storageError) throw new Error('Der Ort wurde gelöscht, aber einzelne Storage-Dateien konnten nicht bereinigt werden.')
  }
}

export async function deleteAdminPhoto(photo: AdminPhoto) {
  const db = client()
  const { data, error } = await db.from('photos').delete().eq('id', photo.id).select('id').single()
  if (error || !data) fail('Das Bild konnte nicht gelöscht werden.', error)
  const { error: storageError } = await db.storage.from('place-photos').remove([photo.storage_path])
  if (storageError) throw new Error('Der Galerieeintrag wurde gelöscht, die Storage-Datei aber nicht vollständig bereinigt.')
  const deletedUrl = db.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl
  if (photo.place?.image_url === deletedUrl) {
    const { data: nextPhoto } = await db.from('photos').select('storage_path').eq('place_id', photo.place_id).order('created_at').limit(1).maybeSingle()
    const nextUrl = nextPhoto ? db.storage.from('place-photos').getPublicUrl(nextPhoto.storage_path).data.publicUrl : null
    const { error: updateError } = await db.from('places').update({ image_url: nextUrl }).eq('id', photo.place_id)
    if (updateError) fail('Das Titelbild konnte nicht aktualisiert werden.', updateError)
  }
}

export async function deleteAdminComment(commentId: string) {
  const { data, error } = await client().from('comments').delete().eq('id', commentId).select('id').single()
  if (error || !data) fail('Der Kommentar konnte nicht gelöscht werden.', error)
}

export async function reviewAdminReport(reportId: string, userId: string) {
  const { data, error } = await client().from('reports').update({ status: 'reviewed', reviewed_at: new Date().toISOString(), reviewed_by: userId }).eq('id', reportId).select('id').single()
  if (error || !data) fail('Der Report konnte nicht als geprüft markiert werden.', error)
}
