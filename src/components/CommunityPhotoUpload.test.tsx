import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useState } from 'react'
import CommunityPhotoUpload from './CommunityPhotoUpload'
import PlaceGallery from './PlaceGallery'
import type { CommunityPhoto } from '../lib/communityPhotos'

const photoMocks = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }))
vi.mock('../lib/communityPhotos', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/communityPhotos')>()
  return { ...actual, uploadCommunityPhotos: photoMocks.upload, deleteOwnCommunityPhoto: photoMocks.remove }
})

const uploadedPhoto: CommunityPhoto = { id: 'photo-1', place_id: 'foreign-place', storage_path: 'user-1/foreign-place/photo.webp', uploaded_by: 'user-1', created_at: '2026-06-20T10:00:00Z', url: 'https://example.com/community.webp' }

function UploadGalleryHarness({ placeId = 'foreign-place', userId = 'user-1' }: { placeId?: string; userId?: string }) {
  const [photos, setPhotos] = useState<CommunityPhoto[]>([])
  return <MemoryRouter><PlaceGallery images={photos.map((photo) => photo.url)} name="Testort"/><CommunityPhotoUpload placeId={placeId} userId={userId} photos={photos} onUploaded={(items) => setPhotos((current) => [...current, ...items])} onDeleted={(photo) => setPhotos((current) => current.filter((item) => item.id !== photo.id))}/></MemoryRouter>
}

describe('CommunityPhotoUpload', () => {
  beforeEach(() => {
    photoMocks.upload.mockReset(); photoMocks.remove.mockReset()
    photoMocks.upload.mockResolvedValue([uploadedPhoto]); photoMocks.remove.mockResolvedValue(undefined)
  })
  afterEach(() => vi.restoreAllMocks())

  it('asks signed-out visitors to log in and exposes no upload control', () => {
    render(<MemoryRouter><CommunityPhotoUpload placeId="place-1" photos={[]} onUploaded={vi.fn()} onDeleted={vi.fn()}/></MemoryRouter>)
    expect(screen.getByText('Melde dich an, um Fotos hinzuzufügen.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Foto hinzufügen' })).not.toBeInTheDocument()
  })

  it('uploads a photo to a foreign active place and updates the gallery immediately', async () => {
    render(<UploadGalleryHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Foto hinzufügen' }))
    const file = new File(['photo'], 'community.webp', { type: 'image/webp' })
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: [file] } })
    expect(await screen.findByAltText('Foto-Vorschau')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '1 Foto hochladen' }))
    await waitFor(() => expect(photoMocks.upload).toHaveBeenCalledWith('foreign-place', [file], expect.any(Function)))
    expect(await screen.findByAltText('Testort, Bild 1 von 1')).toHaveAttribute('src', uploadedPhoto.url)
    expect(screen.getByText('Foto erfolgreich hinzugefügt.')).toBeInTheDocument()
  })

  it('also uploads to a place created by the current user', async () => {
    render(<UploadGalleryHarness placeId="own-place"/>)
    fireEvent.click(screen.getByRole('button', { name: 'Foto hinzufügen' }))
    const file = new File(['photo'], 'own.jpg', { type: 'image/jpeg' })
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: '1 Foto hochladen' }))
    await waitFor(() => expect(photoMocks.upload).toHaveBeenCalledWith('own-place', [file], expect.any(Function)))
  })

  it('blocks unsupported types and files over 4 MB before upload', async () => {
    render(<UploadGalleryHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Foto hinzufügen' }))
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: [new File(['gif'], 'bad.gif', { type: 'image/gif' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('nur JPG-, PNG- oder WebP')
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: [new File([new Uint8Array(4_000_001)], 'large.jpg', { type: 'image/jpeg' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('höchstens 4 MB')
    expect(photoMocks.upload).not.toHaveBeenCalled()
  })

  it('accepts ten photos in one batch', async () => {
    render(<UploadGalleryHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Foto hinzufügen' }))
    const ten = Array.from({ length: 10 }, (_, index) => new File(['photo'], `photo-${index}.webp`, { type: 'image/webp' }))
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: ten } })
    expect(await screen.findAllByAltText(/Foto-Vorschau/)).toHaveLength(10)
    fireEvent.click(screen.getByRole('button', { name: '10 Fotos hochladen' }))
    await waitFor(() => expect(photoMocks.upload).toHaveBeenCalledWith('foreign-place', ten, expect.any(Function)))
  })

  it('rejects more than ten photos in one batch', async () => {
    render(<UploadGalleryHarness/>)
    fireEvent.click(screen.getByRole('button', { name: 'Foto hinzufügen' }))
    const eleven = Array.from({ length: 11 }, (_, index) => new File(['photo'], `photo-${index}.jpg`, { type: 'image/jpeg' }))
    fireEvent.change(screen.getByLabelText('Fotos auswählen'), { target: { files: eleven } })
    expect(await screen.findByRole('alert')).toHaveTextContent('höchstens 10 Fotos')
    expect(photoMocks.upload).not.toHaveBeenCalled()
  })

  it('shows delete controls only for the current users own photos', async () => {
    const own = uploadedPhoto
    const foreign = { ...uploadedPhoto, id: 'photo-2', uploaded_by: 'user-2', url: 'https://example.com/foreign.webp' }
    render(<MemoryRouter><CommunityPhotoUpload placeId="foreign-place" userId="user-1" photos={[own, foreign]} onUploaded={vi.fn()} onDeleted={vi.fn()}/></MemoryRouter>)
    expect(screen.getAllByRole('button', { name: 'Eigenes Foto löschen' })).toHaveLength(1)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Eigenes Foto löschen' }))
    await waitFor(() => expect(photoMocks.remove).toHaveBeenCalledWith(own))
  })
})
