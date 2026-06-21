import { describe, expect, it } from 'vitest'
import { achievementsFor } from './achievements'

describe('achievementsFor', () => {
  it('unlocks milestones at their exact thresholds', () => {
    const achievements = achievementsFor({ places: 5, likesReceived: 10, visited: 10 })
    expect(achievements.filter((item) => item.unlocked).map((item) => item.id)).toEqual(['first-place', 'five-places', 'ten-likes', 'ten-visits'])
  })

  it('keeps future milestones locked', () => {
    expect(achievementsFor({ places: 0, likesReceived: 24, visited: 9 }).find((item) => item.id === 'twenty-five-likes')?.unlocked).toBe(false)
  })
})
