import type { Place } from '../types'

export const placeShareUrl = (placeId: string) => `${window.location.origin}/places/${placeId}`

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }
  const input = document.createElement('textarea')
  input.value = value
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  const copied = document.execCommand('copy')
  input.remove()
  if (!copied) throw new Error('Link konnte nicht kopiert werden.')
}

export async function sharePlace(place: Pick<Place, 'id' | 'name' | 'description'>) {
  const url = placeShareUrl(place.id)
  if (navigator.share) {
    await navigator.share({ title: place.name, text: place.description, url })
    return 'Geteilt.'
  }
  await copyText(url)
  return 'Link kopiert.'
}
