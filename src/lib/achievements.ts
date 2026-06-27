import type { Achievement, ProfileStats } from '../types'

export function achievementsFor(stats: ProfileStats): Achievement[] {
  return [
    achievement('first-place', 'Erste Entdeckung', 'Ersten echten Ort hinzugefügt', stats.places, 1),
    achievement('five-places', '5 Orte entdeckt', '5 Orte für die Community geteilt', stats.places, 5),
    achievement('ten-photos', '10 Fotos hochgeladen', '10 eigene Community-Fotos geteilt', stats.photos, 10),
    achievement('five-visits', '5 Orte besucht', '5 Orte mit „Ich war hier“ markiert', stats.visited, 5),
    achievement('baden-pro', 'Baden-Profi', '3 Aktivitäten an Badestellen', stats.badenActivity, 3),
    achievement('school-scout', 'Schule-Scout', '3 Aktivitäten rund um Schulorte', stats.schoolActivity, 3),
    achievement('local-explorer', 'Local Explorer', 'Level 3 erreicht', stats.xp, 200),
  ]
}

function achievement(id: string, title: string, description: string, progress: number, target: number): Achievement {
  return { id, title, description, progress, target, unlocked: progress >= target }
}

export function levelForXp(xp: number) {
  const safeXp = Math.max(0, Math.floor(xp))
  const level = Math.max(1, Math.floor(safeXp / 100) + 1)
  const currentLevelXp = (level - 1) * 100
  const nextLevelXp = level * 100
  return {
    level,
    xp: safeXp,
    progress: safeXp - currentLevelXp,
    target: nextLevelXp - currentLevelXp,
    remaining: nextLevelXp - safeXp,
    nextLevel: level + 1,
  }
}
