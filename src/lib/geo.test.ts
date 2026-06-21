import { describe, expect, it } from 'vitest'
import type { Place } from '../types'
import { distanceKm, placeScore } from './geo'

describe('geo helpers', () => {
  const place: Place = { id: 'test-place', name: 'Flussbad', description: 'Öffentlicher Badeplatz am Fluss', category: 'Baden', latitude: 47.37, longitude: 8.54, likes_count: 0, created_by: null, created_at: '2026-01-01T00:00:00Z', status: 'active' }
  it('calculates zero distance for identical coordinates', () => expect(distanceKm({ latitude: 47, longitude: 8 }, { latitude: 47, longitude: 8 })).toBe(0))
  it('rewards a matching search term', () => expect(placeScore(place, 'baden')).toBeGreaterThan(placeScore(place, 'fussball')))
  it('rewards nearby places', () => {
    expect(placeScore(place, '', place)).toBeGreaterThan(placeScore(place, '', { latitude: 46, longitude: 7 }))
  })
})
