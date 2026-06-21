import { supabase } from './supabase'

export const COMMUNITY_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const COMMUNITY_PHOTO_MAX_BYTES = 4_000_000
export const COMMUNITY_PHOTO_BATCH_SIZE = 10

export type CommunityPhoto = {
  id: string
  place_id: string
  storage_path: string
  uploaded_by: string
  created_at: string
  url: string
}

export function validateCommunityPhotos(files: File[]) {
  if (!files.length) throw new Error('Wähle mindestens ein Foto aus.')
  if (files.length > COMMUNITY_PHOTO_BATCH_SIZE) throw new Error(`Pro Upload sind höchstens ${COMMUNITY_PHOTO_BATCH_SIZE} Fotos erlaubt. Danach kannst du direkt weitere hinzufügen.`)
  if (files.some((file) => !COMMUNITY_PHOTO_TYPES.includes(file.type as typeof COMMUNITY_PHOTO_TYPES[number]))) {
    const invalid = files.filter((file) => !COMMUNITY_PHOTO_TYPES.includes(file.type as typeof COMMUNITY_PHOTO_TYPES[number])).map((file) => file.name).join(', ')
    throw new Error(`${invalid}: Erlaubt sind nur JPG-, PNG- oder WebP-Bilder.`)
  }
  if (files.some((file) => file.size > COMMUNITY_PHOTO_MAX_BYTES)) {
    const tooLarge = files.filter((file) => file.size > COMMUNITY_PHOTO_MAX_BYTES).map((file) => file.name).join(', ')
    throw new Error(`${tooLarge}: Jedes Foto darf höchstens 4 MB gross sein.`)
  }
}

const getClient = () => {
  if (!supabase) throw new Error('Supabase ist nicht konfiguriert.')
  return supabase
}

export async function loadCommunityPhotos(placeId: string): Promise<CommunityPhoto[]> {
  const db = getClient()
  const { data, error } = await db.from('photos').select('id,place_id,storage_path,uploaded_by,created_at').eq('place_id', placeId).order('created_at')
  if (error) throw new Error('Die Galerie konnte nicht geladen werden.')
  return (data || []).map((photo) => ({ ...photo, url: db.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl }))
}

export async function uploadCommunityPhotos(placeId: string, files: File[], onProgress?: (uploaded: number, total: number) => void): Promise<CommunityPhoto[]> {
  validateCommunityPhotos(files)
  const db = getClient()
  const { data: authData, error: authError } = await db.auth.getUser()
  if (authError || !authData.user) throw new Error('Melde dich an, um Fotos hinzuzufügen.')
  const { data: place, error: placeError } = await db.from('places').select('id,status').eq('id', placeId).eq('status', 'active').maybeSingle()
  if (placeError || !place) throw new Error('Fotos können nur zu aktiven Orten hinzugefügt werden.')

  const uploadedPaths: string[] = []
  try {
    for (const [index, file] of files.entries()) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type]
      const storagePath = `${authData.user.id}/${placeId}/${crypto.randomUUID()}.${extension}`
      const { error } = await db.storage.from('place-photos').upload(storagePath, file, { contentType: file.type, upsert: false })
      if (error) throw new Error(`${file.name}: Upload fehlgeschlagen (${error.message})`)
      uploadedPaths.push(storagePath)
      onProgress?.(index + 1, files.length)
    }
    const { data, error } = await db.from('photos').insert(uploadedPaths.map((storagePath) => ({ place_id: placeId, storage_path: storagePath, uploaded_by: authData.user.id }))).select('id,place_id,storage_path,uploaded_by,created_at')
    if (error || !data) throw new Error(error?.message || 'Die Fotos konnten nicht mit dem Ort verknüpft werden.')
    return data.map((photo) => ({ ...photo, url: db.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl }))
  } catch (cause) {
    if (uploadedPaths.length) await db.storage.from('place-photos').remove(uploadedPaths)
    throw cause
  }
}

export async function deleteOwnCommunityPhoto(photo: CommunityPhoto) {
  const db = getClient()
  const { data: authData } = await db.auth.getUser()
  if (!authData.user) throw new Error('Bitte zuerst anmelden.')
  const deletedUrl = db.storage.from('place-photos').getPublicUrl(photo.storage_path).data.publicUrl
  const { data: place } = await db.from('places').select('image_url').eq('id', photo.place_id).maybeSingle()
  const { data, error } = await db.from('photos').delete().eq('id', photo.id).eq('uploaded_by', authData.user.id).select('id').single()
  if (error || !data) throw new Error('Du kannst nur deine eigenen Fotos löschen.')
  const { error: storageError } = await db.storage.from('place-photos').remove([photo.storage_path])
  if (storageError) throw new Error('Das Foto wurde aus der Galerie entfernt, die Storage-Datei konnte aber nicht bereinigt werden.')
  if (place?.image_url === deletedUrl) {
    const { data: nextPhoto } = await db.from('photos').select('storage_path').eq('place_id', photo.place_id).order('created_at').limit(1).maybeSingle()
    const nextUrl = nextPhoto ? db.storage.from('place-photos').getPublicUrl(nextPhoto.storage_path).data.publicUrl : null
    const { error: coverError } = await db.from('places').update({ image_url: nextUrl }).eq('id', photo.place_id)
    if (coverError) throw new Error('Das Foto wurde gelöscht, das Titelbild konnte aber nicht aktualisiert werden.')
  }
}
