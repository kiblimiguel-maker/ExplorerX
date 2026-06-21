import type { Coordinates, Place } from '../types'

export function distanceKm(a: Coordinates, b: Coordinates) {
  const rad = (value: number) => (value * Math.PI) / 180
  const dLat = rad(b.latitude - a.latitude)
  const dLon = rad(b.longitude - a.longitude)
  const lat1 = rad(a.latitude)
  const lat2 = rad(b.latitude)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
}

export function placeScore(place: Place, query: string, user?: Coordinates | null) {
  const terms = `${place.name} ${place.description} ${place.category}`.toLocaleLowerCase('de-CH')
  const match = query && terms.includes(query.toLocaleLowerCase('de-CH')) ? 80 : 0
  const proximity = user ? Math.max(0, 50 - distanceKm(user, place) * 8) : 0
  return place.likes_count * 0.65 + match + proximity
}
