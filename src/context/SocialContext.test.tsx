import { fireEvent, render, screen } from '@testing-library/react'
import { SocialProvider, useSocial } from './SocialContext'

vi.mock('../lib/supabase', () => ({ supabase: null }))

function FavoriteProbe() {
  const { favoriteIds, toggleFavorite } = useSocial()
  return <button onClick={() => toggleFavorite('place-1')}>{favoriteIds.has('place-1') ? 'Gespeichert' : 'Speichern'}</button>
}

function VisitProbe() {
  const { visitedIds, toggleVisit } = useSocial()
  return <button onClick={() => toggleVisit('place-1')}>{visitedIds.has('place-1') ? 'War hier' : 'Ich war hier'}</button>
}

it('stores and removes a demo favorite', () => {
  localStorage.clear()
  render(<SocialProvider><FavoriteProbe/></SocialProvider>)
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(button).toHaveTextContent('Gespeichert')
  fireEvent.click(button)
  expect(button).toHaveTextContent('Speichern')
})

it('sets and removes a visit explicitly', () => {
  localStorage.clear()
  render(<SocialProvider><VisitProbe/></SocialProvider>)
  const button = screen.getByRole('button')
  fireEvent.click(button)
  expect(button).toHaveTextContent('War hier')
  fireEvent.click(button)
  expect(button).toHaveTextContent('Ich war hier')
})
