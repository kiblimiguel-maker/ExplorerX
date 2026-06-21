import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import AdminPage from './AdminPage'

const adminMocks = vi.hoisted(() => ({
  load: vi.fn(), hidePlace: vi.fn(), deletePlace: vi.fn(), deletePhoto: vi.fn(), deleteComment: vi.fn(), reviewReport: vi.fn(),
}))
vi.mock('../context/SocialContext', () => ({ useSocial: () => ({ user: { id: 'admin-user' } }) }))
vi.mock('../lib/admin', () => ({
  loadAdminDashboard: adminMocks.load,
  hideAdminPlace: adminMocks.hidePlace,
  deleteAdminPlace: adminMocks.deletePlace,
  deleteAdminPhoto: adminMocks.deletePhoto,
  deleteAdminComment: adminMocks.deleteComment,
  reviewAdminReport: adminMocks.reviewReport,
}))

const dashboard = {
  counts: { users: 4, places: 3, photos: 2, comments: 1, reports: 1 },
  places: [{ id: 'place-1', name: 'Neuer Ort', description: 'Ein öffentlicher Testort für die Moderation.', category: 'Natur', latitude: 47, longitude: 8, likes_count: 0, created_by: 'user-1', created_at: '2026-06-20T10:00:00Z', status: 'active' }],
  comments: [{ id: 'comment-1', body: 'Unpassender Kommentar', created_at: '2026-06-20T11:00:00Z', user_id: 'user-1', author: { display_name: 'Test User' }, place: { id: 'place-1', name: 'Neuer Ort' } }],
  reports: [{ id: 'report-1', reason: 'Unpassender Inhalt', status: 'open', created_at: '2026-06-20T12:00:00Z', place_id: 'place-1', place: { id: 'place-1', name: 'Neuer Ort', status: 'active' } }],
  photos: [{ id: 'photo-1', place_id: 'place-1', storage_path: 'user-1/photo.webp', created_at: '2026-06-20T10:00:00Z', place: { id: 'place-1', name: 'Neuer Ort', image_url: 'https://example.com/photo.webp' }, public_url: 'https://example.com/photo.webp' }],
}

describe('AdminPage', () => {
  beforeEach(() => {
    Object.values(adminMocks).forEach((mock) => mock.mockReset())
    adminMocks.load.mockResolvedValue(dashboard)
    adminMocks.hidePlace.mockResolvedValue(undefined)
    adminMocks.deletePlace.mockResolvedValue(undefined)
    adminMocks.deletePhoto.mockResolvedValue(undefined)
    adminMocks.deleteComment.mockResolvedValue(undefined)
    adminMocks.reviewReport.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  afterEach(() => vi.restoreAllMocks())

  it('shows protected counts and performs all moderation actions after confirmation', async () => {
    render(<AdminPage/>)
    expect(await screen.findByRole('heading', { name: 'Moderation' })).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()

    const reportPanel = screen.getByRole('heading', { name: 'Gemeldete Orte' }).closest('section') as HTMLElement
    fireEvent.click(within(reportPanel).getByRole('button', { name: /Prüfen/ }))
    await waitFor(() => expect(adminMocks.reviewReport).toHaveBeenCalledWith('report-1', 'admin-user'))

    const placesPanel = screen.getByRole('heading', { name: 'Neueste Orte' }).closest('section') as HTMLElement
    fireEvent.click(within(placesPanel).getByRole('button', { name: /Ausblenden/ }))
    await waitFor(() => expect(adminMocks.hidePlace).toHaveBeenCalledWith('place-1'))
    fireEvent.click(within(placesPanel).getByRole('button', { name: /Löschen/ }))
    await waitFor(() => expect(adminMocks.deletePlace).toHaveBeenCalledWith('place-1'))

    fireEvent.click(screen.getByRole('button', { name: 'Kommentar löschen' }))
    await waitFor(() => expect(adminMocks.deleteComment).toHaveBeenCalledWith('comment-1'))
    fireEvent.click(screen.getByRole('button', { name: 'Bild löschen' }))
    await waitFor(() => expect(adminMocks.deletePhoto).toHaveBeenCalledWith(expect.objectContaining({ id: 'photo-1' })))
    expect(window.confirm).toHaveBeenCalled()
  })
})
