import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'

it('offers a safe route back to the map', () => {
  render(<MemoryRouter><NotFoundPage /></MemoryRouter>)
  expect(screen.getByRole('heading', { name: /Diese Route/ })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Zur Karte' })).toHaveAttribute('href', '/map')
})
