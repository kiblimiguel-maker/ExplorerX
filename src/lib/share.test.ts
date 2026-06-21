import { sharePlace } from './share'

describe('sharePlace', () => {
  it('uses the Web Share API when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: share })
    await expect(sharePlace({ id: 'place-1', name: 'See', description: 'Am Wasser' })).resolves.toBe('Geteilt.')
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: `${window.location.origin}/places/place-1` }))
  })

  it('copies the direct place URL when Web Share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined })
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    await expect(sharePlace({ id: 'place-2', name: 'Wald', description: 'Im Grünen' })).resolves.toBe('Link kopiert.')
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/places/place-2`)
  })
})
