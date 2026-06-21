import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import RequireAdmin from './RequireAdmin'

const social = vi.hoisted(() => ({ value: { user: null as null | { id: string }, isAdmin: false, isLoading: false } }))
vi.mock('../context/SocialContext', () => ({ useSocial: () => social.value }))

function renderAdminRoute() {
  return render(<MemoryRouter initialEntries={['/admin']}><Routes>
    <Route path="/admin" element={<RequireAdmin><div>Admin Dashboard</div></RequireAdmin>}/>
    <Route path="/login" element={<div>Google Login</div>}/>
    <Route path="/map" element={<div>Karte</div>}/>
  </Routes></MemoryRouter>)
}

beforeEach(() => { social.value = { user: null, isAdmin: false, isLoading: false } })

it('sends signed-out visitors to login', () => {
  renderAdminRoute()
  expect(screen.getByText('Google Login')).toBeInTheDocument()
})

it('sends normal users back to the map', () => {
  social.value = { user: { id: 'user-1' }, isAdmin: false, isLoading: false }
  renderAdminRoute()
  expect(screen.getByText('Karte')).toBeInTheDocument()
})

it('allows users verified through admin_users', () => {
  social.value = { user: { id: 'admin-1' }, isAdmin: true, isLoading: false }
  renderAdminRoute()
  expect(screen.getByText('Admin Dashboard')).toBeInTheDocument()
})
