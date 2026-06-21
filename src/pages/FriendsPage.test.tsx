import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import FriendsPage from './FriendsPage'

const friendMocks = vi.hoisted(() => ({
  load: vi.fn(),
  search: vi.fn(),
  send: vi.fn(),
  answer: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('../context/SocialContext', () => ({ useSocial: () => ({ user: { id: 'user-1' }, stats: { places: 0, visited: 0, likesReceived: 0 }, achievements: [] }) }))
vi.mock('../context/PlacesContext', () => ({ usePlaces: () => ({ places: [] }) }))
vi.mock('../lib/friendships', async () => {
  const actual = await vi.importActual<typeof import('../lib/friendships')>('../lib/friendships')
  return { ...actual, loadFriendships: friendMocks.load, searchProfiles: friendMocks.search, sendFriendRequest: friendMocks.send, answerFriendRequest: friendMocks.answer, removeFriendship: friendMocks.remove }
})

const profile = (id: string, display_name: string) => ({ id, display_name, avatar_url: null })
const friendships = [
  { id: 'accepted', requester_id: 'user-1', addressee_id: 'user-2', status: 'accepted', created_at: '2026-06-01', updated_at: '2026-06-02', requester: profile('user-1', 'Ich'), addressee: profile('user-2', 'Mia') },
  { id: 'incoming-1', requester_id: 'user-3', addressee_id: 'user-1', status: 'pending', created_at: '2026-06-03', updated_at: '2026-06-03', requester: profile('user-3', 'Leo'), addressee: profile('user-1', 'Ich') },
  { id: 'incoming-2', requester_id: 'user-4', addressee_id: 'user-1', status: 'pending', created_at: '2026-06-03', updated_at: '2026-06-03', requester: profile('user-4', 'Noa'), addressee: profile('user-1', 'Ich') },
  { id: 'outgoing', requester_id: 'user-1', addressee_id: 'user-5', status: 'pending', created_at: '2026-06-04', updated_at: '2026-06-04', requester: profile('user-1', 'Ich'), addressee: profile('user-5', 'Ari') },
]

beforeEach(() => {
  friendMocks.load.mockResolvedValue(friendships)
  friendMocks.search.mockResolvedValue([{ ...profile('user-6', 'Lina'), bio: 'Draussen unterwegs' }])
  friendMocks.send.mockResolvedValue(undefined)
  friendMocks.answer.mockResolvedValue(undefined)
  friendMocks.remove.mockResolvedValue(undefined)
})

it('searches people and sends a friendship request', async () => {
  render(<MemoryRouter><FriendsPage/></MemoryRouter>)
  await screen.findByText('Meine Freunde')
  fireEvent.change(screen.getByPlaceholderText('Explorer nach Anzeigename suchen…'), { target: { value: 'Lina' } })
  fireEvent.click(screen.getByRole('button', { name: 'Suchen' }))
  await screen.findByText('Lina')
  fireEvent.click(screen.getByRole('button', { name: /Anfragen/ }))
  await waitFor(() => expect(friendMocks.send).toHaveBeenCalledWith('user-6'))
})

it('accepts, rejects and removes friendships', async () => {
  render(<MemoryRouter><FriendsPage/></MemoryRouter>)
  await screen.findByText('Mia')
  fireEvent.click(screen.getAllByRole('button', { name: 'Anfrage annehmen' })[0])
  await waitFor(() => expect(friendMocks.answer).toHaveBeenCalledWith('incoming-1', 'accepted'))
  fireEvent.click(screen.getAllByRole('button', { name: 'Anfrage ablehnen' })[1])
  await waitFor(() => expect(friendMocks.answer).toHaveBeenCalledWith('incoming-2', 'rejected'))
  fireEvent.click(screen.getByRole('button', { name: 'Mia entfernen' }))
  await waitFor(() => expect(friendMocks.remove).toHaveBeenCalledWith('accepted'))
  fireEvent.click(screen.getByRole('button', { name: 'Anfrage zurückziehen' }))
  await waitFor(() => expect(friendMocks.remove).toHaveBeenCalledWith('outgoing'))
})
