import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import AuthPage from './AuthPage'
import { MemoryRouter } from 'react-router-dom'

const authMocks = vi.hoisted(() => ({ signInWithOAuth: vi.fn() }))
vi.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithOAuth: authMocks.signInWithOAuth } },
  isSupabaseConfigured: true,
  missingSupabaseVariables: [],
}))

beforeEach(() => authMocks.signInWithOAuth.mockReset().mockResolvedValue({ data: { url: 'https://accounts.google.com/' }, error: null }))

it('shows only Google login and starts OAuth', async () => {
  render(<MemoryRouter><AuthPage/></MemoryRouter>)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(screen.queryByText(/Magic Link|Login-Link|OTP|Code eingeben/i)).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Mit Google anmelden' }))
  await waitFor(() => expect(authMocks.signInWithOAuth).toHaveBeenCalledTimes(1))
  expect(authMocks.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'http://localhost:3000/auth/callback' } })
})

it('shows a provider error and re-enables the button', async () => {
  authMocks.signInWithOAuth.mockResolvedValueOnce({ data: null, error: new Error('Provider is not enabled') })
  render(<MemoryRouter><AuthPage/></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Mit Google anmelden' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('nicht aktiviert')
  expect(screen.getByRole('button', { name: 'Mit Google anmelden' })).toBeEnabled()
})
