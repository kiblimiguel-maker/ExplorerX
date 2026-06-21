import type { Achievement, ProfileStats } from '../types'

export function achievementsFor(stats: ProfileStats): Achievement[] {
  return [
    { id: 'first-place', title: 'Erste Entdeckung', description: 'Ersten Ort erstellt', unlocked: stats.places >= 1 },
    { id: 'five-places', title: 'Local Guide', description: '5 Orte erstellt', unlocked: stats.places >= 5 },
    { id: 'ten-likes', title: 'Community Pick', description: '10 Likes erhalten', unlocked: stats.likesReceived >= 10 },
    { id: 'twenty-five-likes', title: 'Trendsetter', description: '25 Likes erhalten', unlocked: stats.likesReceived >= 25 },
    { id: 'ten-visits', title: 'Stadtentdecker', description: '10 Orte besucht', unlocked: stats.visited >= 10 },
  ]
}
