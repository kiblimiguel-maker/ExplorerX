import { describe, expect, it } from 'vitest'
import { achievementsFor } from './achievements'

describe('achievementsFor', () => {
  it('unlocks milestones at their exact thresholds', () => {
    const achievements = achievementsFor({ places: 5, likesReceived: 0, visited: 5, photos: 10, comments: 0, favorites: 0, xp: 200, badenActivity: 3, schoolActivity: 3 })
    expect(achievements.filter((item) => item.unlocked).map((item) => item.id)).toEqual(['first-place', 'five-places', 'ten-photos', 'five-visits', 'baden-pro', 'school-scout', 'local-explorer'])
  })

  it('keeps future milestones locked', () => {
    expect(achievementsFor({ places: 0, likesReceived: 24, visited: 4, photos: 9, comments: 0, favorites: 0, xp: 199, badenActivity: 2, schoolActivity: 2 }).find((item) => item.id === 'local-explorer')?.unlocked).toBe(false)
  })
})
