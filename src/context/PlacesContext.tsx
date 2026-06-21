import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { NewPlace, Place } from '../types'

export type SocialCountKey = 'favorites_count' | 'comments_count' | 'photos_count' | 'visits_count'

type PlacesContextValue = {
  places: Place[]
  likedIds: Set<string>
  isLoading: boolean
  dataMode: 'cloud' | 'offline' | 'demo'
  notice: { type: 'success' | 'error' | 'info'; message: string } | null
  clearNotice: () => void
  setPlacePhotoCover: (placeId: string, imageUrl?: string) => void
  adjustSocialCount: (placeId: string, key: SocialCountKey, delta: number) => void
  addPlace: (place: NewPlace, onUploadProgress?: (uploaded: number, total: number) => void) => Promise<Place>
  toggleLike: (id: string) => Promise<void>
  reportPlace: (id: string, reason: string) => Promise<void>
}

const PlacesContext = createContext<PlacesContextValue | null>(null)
const isLegacySeed = (id: string) => /^10000000-0000-4000-8000-0000000000(?:0[1-9]|10)$/.test(id)
const readLocal = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('explorerx.places') || 'null') as Place[] | null
    return stored?.filter((place) => !isLegacySeed(place.id)) || null
  } catch { return null }
}
const readStringSet = (key: string) => {
  try { return new Set<string>(JSON.parse(localStorage.getItem(key) || '[]')) } catch { return new Set<string>() }
}
const fileToDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => resolve(String(reader.result))
  reader.onerror = () => reject(new Error('Das Foto konnte nicht gelesen werden.'))
  reader.readAsDataURL(file)
})

export function PlacesProvider({ children }: { children: ReactNode }) {
  const [places, setPlaces] = useState<Place[]>(() => supabase ? [] : readLocal() || [])
  const [likedIds, setLikedIds] = useState<Set<string>>(() => supabase ? new Set() : readStringSet('explorerx.likes'))
  const [reportedIds, setReportedIds] = useState<Set<string>>(() => supabase ? new Set() : readStringSet('explorerx.reports'))
  const [isLoading, setIsLoading] = useState(Boolean(supabase))
  const [dataMode, setDataMode] = useState<PlacesContextValue['dataMode']>(supabase ? 'cloud' : 'demo')
  const [notice, setNotice] = useState<PlacesContextValue['notice']>(null)

  useEffect(() => {
    if (!supabase) return
    const client = supabase
    let active = true
    const loadUserState = async (userId?: string) => {
      if (!userId) {
        if (active) { setLikedIds(new Set()); setReportedIds(new Set()) }
        return
      }
      const [likesResult, reportsResult] = await Promise.all([
        client.from('likes').select('place_id').eq('user_id', userId),
        client.from('reports').select('place_id').eq('reported_by', userId),
      ])
      if (!active) return
      setLikedIds(new Set((likesResult.data || []).map((like) => like.place_id)))
      setReportedIds(new Set((reportsResult.data || []).map((report) => report.place_id)))
    }
    Promise.all([
      client.from('places').select('*, photos(storage_path)').eq('status', 'active').order('created_at', { ascending: false }).order('created_at', { referencedTable: 'photos', ascending: true }).limit(1, { referencedTable: 'photos' }),
      client.auth.getSession(),
    ]).then(async ([placesResult, authResult]) => {
      if (!active) return
      if (placesResult.error) {
        setDataMode('offline')
        setPlaces(readLocal() || [])
        setNotice({ type: 'error', message: 'Cloud-Daten sind nicht erreichbar. ExplorerX nutzt die lokale Kopie.' })
      } else {
        const rawPlaces = (placesResult.data || []).map((row) => {
          const value = row as unknown as Place & { photos?: Array<{ storage_path: string }> }
          const { photos, ...place } = value
          const fallback = photos?.[0]?.storage_path ? client.storage.from('place-photos').getPublicUrl(photos[0].storage_path).data.publicUrl : undefined
          return { ...place, image_url: place.image_url || fallback } as Place
        }).filter((place) => !isLegacySeed(place.id))
        const creatorIds = [...new Set(rawPlaces.map((place) => place.created_by).filter((id): id is string => Boolean(id)))]
        const profilesResult = creatorIds.length
          ? await client.from('users').select('id,display_name,avatar_url').in('id', creatorIds)
          : { data: [], error: null }
        const profiles = new Map((profilesResult.data || []).map((profile) => [profile.id, profile]))
        const cloudPlaces = rawPlaces.map((place) => ({ ...place, creator: place.created_by ? profiles.get(place.created_by) || null : null }))
        setDataMode('cloud')
        setPlaces(cloudPlaces)
      }
      void loadUserState(authResult.data.session?.user.id)
    }).finally(() => setIsLoading(false))
    const { data } = client.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => { void loadUserState(session?.user.id) }, 0)
    })
    return () => { active = false; data.subscription.unsubscribe() }
  }, [])

  useEffect(() => { if (!isLoading) localStorage.setItem('explorerx.places', JSON.stringify(places)) }, [isLoading, places])
  useEffect(() => { localStorage.setItem('explorerx.likes', JSON.stringify([...likedIds])) }, [likedIds])
  useEffect(() => { localStorage.setItem('explorerx.reports', JSON.stringify([...reportedIds])) }, [reportedIds])

  const addPlace = async (input: NewPlace, onUploadProgress?: (uploaded: number, total: number) => void) => {
    const { photos = [], ...placeInput } = input
    if (photos.length > 10) throw new Error('Pro Upload sind höchstens 10 Fotos erlaubt.')
    if (photos.some((photo) => !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 4_000_000)) {
      throw new Error('Jedes Foto muss JPG, PNG oder WebP und höchstens 4 MB gross sein.')
    }
    if (dataMode === 'offline') throw new Error('Im Offline-Modus können keine neuen Orte veröffentlicht werden.')
    if (supabase) {
      const { data: authData } = await supabase.auth.getUser()
      if (!authData.user) throw new Error('Bitte zuerst anmelden.')
      let imageUrl = input.image_url
      const placeId = crypto.randomUUID()
      const uploadedPaths: string[] = []
      for (const [index, photo] of photos.entries()) {
        const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[photo.type]
        const storagePath = `${authData.user.id}/${placeId}-${index + 1}.${extension}`
        const { error: uploadError } = await supabase.storage.from('place-photos').upload(storagePath, photo, { contentType: photo.type, upsert: false })
        if (uploadError) { if (uploadedPaths.length) await supabase.storage.from('place-photos').remove(uploadedPaths); throw uploadError }
        uploadedPaths.push(storagePath)
        if (index === 0) imageUrl = supabase.storage.from('place-photos').getPublicUrl(storagePath).data.publicUrl
        onUploadProgress?.(index + 1, photos.length)
      }
      const { data, error } = await supabase.from('places').insert({ ...placeInput, id: placeId, image_url: imageUrl, created_by: authData.user.id }).select().single()
      if (error) {
        if (uploadedPaths.length) await supabase.storage.from('place-photos').remove(uploadedPaths)
        throw error
      }
      if (uploadedPaths.length) {
        const { error: photoError } = await supabase.from('photos').insert(uploadedPaths.map((storagePath) => ({ place_id: placeId, storage_path: storagePath, uploaded_by: authData.user.id })))
        if (photoError) throw new Error('Der Ort wurde gespeichert, aber die Galerie konnte nicht verbunden werden. Bitte prüfe die photos-Tabelle und ihre RLS-Policy.')
      }
      setPlaces((current) => [data as Place, ...current])
      setDataMode('cloud')
      setNotice({ type: 'success', message: 'Dein Ort wurde veröffentlicht.' })
      return data as Place
    }
    const localImage = photos[0] ? await fileToDataUrl(photos[0]) : input.image_url
    const place: Place = { ...placeInput, image_url: localImage, id: crypto.randomUUID(), likes_count: 0, created_by: 'local-user', created_at: new Date().toISOString(), status: 'active' }
    setPlaces((current) => [place, ...current])
    setNotice({ type: 'success', message: 'Dein Ort wurde lokal gespeichert.' })
    return place
  }

  const toggleLike = async (id: string) => {
    const liked = likedIds.has(id)
    if (dataMode === 'offline') { setNotice({ type: 'error', message: 'Likes sind im Offline-Modus deaktiviert.' }); return }
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setNotice({ type: 'info', message: 'Melde dich an, um Cloud-Orte zu liken.' }); return }
      const result = liked
        ? await supabase.from('likes').delete().eq('user_id', data.user.id).eq('place_id', id)
        : await supabase.from('likes').insert({ user_id: data.user.id, place_id: id })
      if (result.error) { setNotice({ type: 'error', message: 'Der Like konnte nicht gespeichert werden.' }); return }
      const { data: refreshed, error: refreshError } = await supabase.from('places').select('likes_count').eq('id', id).single()
      if (refreshError) { setNotice({ type: 'error', message: 'Der Like wurde gespeichert, der Zähler konnte aber nicht aktualisiert werden.' }); return }
      setPlaces((current) => current.map((place) => place.id === id ? { ...place, likes_count: refreshed.likes_count } : place))
    }
    setLikedIds((current) => { const next = new Set(current); if (liked) next.delete(id); else next.add(id); return next })
    if (!supabase) setPlaces((current) => current.map((place) => place.id === id ? { ...place, likes_count: Math.max(0, place.likes_count + (liked ? -1 : 1)) } : place))
  }

  const reportPlace = async (placeId: string, reason: string) => {
    if (dataMode === 'offline') throw new Error('Meldungen sind im Offline-Modus deaktiviert.')
    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (!data.user) throw new Error('Bitte zuerst anmelden.')
      const { error } = await supabase.from('reports').insert({ place_id: placeId, reason, reported_by: data.user.id })
      if (error) throw error
    }
    setReportedIds((current) => new Set(current).add(placeId))
    setNotice({ type: 'success', message: 'Danke. Die Meldung wurde gespeichert und wird geprüft.' })
  }

  const clearNotice = () => setNotice(null)
  const setPlacePhotoCover = (placeId: string, imageUrl?: string) => setPlaces((current) => current.map((place) => place.id === placeId ? { ...place, image_url: imageUrl } : place))
  const adjustSocialCount = (placeId: string, key: SocialCountKey, delta: number) => setPlaces((current) => current.map((place) => place.id === placeId ? { ...place, [key]: Math.max(0, (place[key] || 0) + delta) } : place))
  const visiblePlaces = places.filter((place) => !reportedIds.has(place.id) && place.status === 'active')
  const value = { places: visiblePlaces, likedIds, isLoading, dataMode, notice, clearNotice, setPlacePhotoCover, adjustSocialCount, addPlace, toggleLike, reportPlace }
  return <PlacesContext.Provider value={value}>{children}</PlacesContext.Provider>
}

export const usePlaces = () => {
  const value = useContext(PlacesContext)
  if (!value) throw new Error('usePlaces must be used within PlacesProvider')
  return value
}

export const useOptionalPlaces = () => useContext(PlacesContext)
