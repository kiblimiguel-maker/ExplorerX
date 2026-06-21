import { describe, expect, it } from 'vitest'
import { isPrivateAddress } from './validation'

describe('private address validation', () => {
  it.each(['Musterstrasse 12', 'Musterstraße 12a', 'Musterstr. 7', 'Parkweg 3'])('blocks %s', (value) => expect(isPrivateAddress(value)).toBe(true))
  it.each(['Josefwiese, Zürich', 'Hauptbahnhof', 'Area 51 Skatepark'])('allows public place name %s', (value) => expect(isPrivateAddress(value)).toBe(false))
})
