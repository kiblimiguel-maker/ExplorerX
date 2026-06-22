import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import AddPlacePage from './AddPlacePage'
import { LocationProvider } from '../context/LocationContext'

const mocks = vi.hoisted(() => ({ addPlace: vi.fn() }))
vi.mock('../context/PlacesContext', () => ({ usePlaces: () => ({ addPlace: mocks.addPlace }) }))
vi.mock('../components/MapView', () => ({
  default: ({ onPick, picked }: { onPick?: (p: { latitude: number; longitude: number }) => void; picked?: { latitude: number; longitude: number } | null }) => <div>
    <button type="button" onClick={() => onPick?.({ latitude: 47.37, longitude: 8.54 })}>Kartenposition wählen</button>
    {picked && <output>Marker {picked.latitude.toFixed(5)}, {picked.longitude.toFixed(5)}</output>}
  </div>,
}))

const renderPage = () => render(<MemoryRouter><LocationProvider><AddPlacePage/></LocationProvider></MemoryRouter>)
const addPhoto = (container: HTMLElement) => fireEvent.change(container.querySelector('input[type="file"]') as HTMLInputElement, { target: { files: [new File(['photo'], 'ort.webp', { type: 'image/webp' })] } })
const setGeolocation = (getCurrentPosition?: Geolocation['getCurrentPosition']) => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: getCurrentPosition ? { getCurrentPosition } : undefined })
}

describe('AddPlacePage', () => {
  beforeEach(() => {
    mocks.addPlace.mockReset()
    mocks.addPlace.mockResolvedValue({ id: 'created-place' })
    sessionStorage.clear()
    setGeolocation()
  })

  it('rejects a private house number', async () => {
    const { container } = renderPage()
    fireEvent.change(screen.getByLabelText('Name des Ortes'), { target: { value: 'Toller Platz' } })
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Ein wirklich toller öffentlicher Platz für alle.' } })
    addPhoto(container)
    fireEvent.change(screen.getByPlaceholderText('z.B. Josefwiese, Zürich'), { target: { value: 'Teststrasse 42' } })
    fireEvent.click(screen.getByText('Kartenposition wählen'))
    fireEvent.click(screen.getByRole('button', { name: /Ort veröffentlichen/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('keine private Hausnummer')
  })

  it('uses the current location and passes it when creating a place', async () => {
    const getCurrentPosition = vi.fn((success: PositionCallback) => success({ coords: { latitude: 47.3769, longitude: 8.5417 } } as GeolocationPosition))
    setGeolocation(getCurrentPosition)
    const { container } = renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }))
    expect(await screen.findByText(/Aktueller Standort übernommen/)).toBeInTheDocument()
    expect(screen.getByText('Marker 47.37690, 8.54170')).toBeInTheDocument()
    expect(getCurrentPosition).toHaveBeenCalledWith(expect.any(Function), expect.any(Function), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 })

    fireEvent.change(screen.getByLabelText('Name des Ortes'), { target: { value: 'Flussplatz' } })
    fireEvent.change(screen.getByLabelText('Beschreibung'), { target: { value: 'Ein öffentlicher Platz direkt am schönen Fluss.' } })
    addPhoto(container)
    fireEvent.click(screen.getByRole('button', { name: /Ort veröffentlichen/ }))
    await waitFor(() => expect(mocks.addPlace).toHaveBeenCalledWith(expect.objectContaining({ latitude: 47.3769, longitude: 8.5417 }), expect.any(Function)))
  })

  it('shows a clear fallback when location permission is blocked', async () => {
    setGeolocation((_, failure) => failure?.({ code: 1, PERMISSION_DENIED: 1 } as GeolocationPositionError))
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Standortzugriff wurde blockiert')
    expect(screen.getByText('Kartenposition wählen')).toBeEnabled()
  })

  it('keeps manual map selection available without browser geolocation', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Aktuellen Standort verwenden' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('nicht verfügbar')
    fireEvent.click(screen.getByText('Kartenposition wählen'))
    expect(screen.getByText('Marker 47.37000, 8.54000')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a preview for a valid photo', async () => {
    const { container } = renderPage()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const photo = new File(['photo'], 'platz.webp', { type: 'image/webp' })
    fireEvent.change(input, { target: { files: [photo] } })
    expect(await screen.findByAltText('Foto-Vorschau')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Foto entfernen' })).toBeInTheDocument()
  })

  it('shows the privacy warning for school places', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Schule' }))
    expect(screen.getByText(/keine privaten Daten, Stundenpläne oder Informationen über einzelne Schüler/i)).toBeInTheDocument()
  })

  it('rejects unsupported photos and more than ten files per batch', async () => {
    const { container } = renderPage()
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [new File(['bad'], 'foto.gif', { type: 'image/gif' })] } })
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG oder WebP')
    const files = Array.from({ length: 11 }, (_, index) => new File(['photo'], `foto-${index}.jpg`, { type: 'image/jpeg' }))
    fireEvent.change(input, { target: { files } })
    expect(await screen.findByRole('alert')).toHaveTextContent('höchstens 10 Fotos')
  })
})
