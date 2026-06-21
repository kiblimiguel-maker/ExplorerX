import { fireEvent, render, screen } from '@testing-library/react'
import UserAvatar from './UserAvatar'

it('falls back to the profile initial when an external avatar fails', () => {
  render(<UserAvatar url="https://example.com/missing.jpg" name="Miguel" imageAlt="Profilbild"/>)
  fireEvent.error(screen.getByRole('img', { name: 'Profilbild' }))
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
  expect(screen.getByLabelText('Miguel')).toHaveTextContent('M')
})
