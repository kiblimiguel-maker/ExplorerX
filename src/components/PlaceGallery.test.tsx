import { fireEvent, render, screen, within } from '@testing-library/react'
import PlaceGallery from './PlaceGallery'

describe('PlaceGallery', () => {
  it('renders large galleries lazily in stable batches', () => {
    const images = Array.from({ length: 30 }, (_, index) => `https://example.com/photo-${index}.webp`)
    render(<PlaceGallery images={images} name="Viele Fotos"/>)
    const grid = screen.getByRole('region', { name: 'Viele Fotos Fotogalerie' })
    expect(within(grid).getAllByRole('button')).toHaveLength(24)
    const firstImage = grid.querySelector('img')
    expect(firstImage).toHaveAttribute('loading', 'lazy')
    expect(firstImage).toHaveAttribute('width', '320')
    fireEvent.click(screen.getByRole('button', { name: /Weitere Fotos anzeigen/ }))
    expect(within(grid).getAllByRole('button')).toHaveLength(30)
  })
})
