import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { LocationProvider, useLocationStatus } from './LocationContext'

function Probe() {
  const { status, location, error, requestLocation } = useLocationStatus()
  return <div><button onClick={() => void requestLocation()}>Standort aktivieren</button><output>{status}:{location ? `${location.latitude},${location.longitude}` : error}</output></div>
}

const setGeolocation = (getCurrentPosition?: Geolocation['getCurrentPosition']) => {
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: getCurrentPosition ? { getCurrentPosition } : undefined })
}

beforeEach(() => sessionStorage.clear())

it('stores an allowed location only for the browser session', async () => {
  setGeolocation((success) => success({ coords: { latitude: 47.37, longitude: 8.54 } } as GeolocationPosition))
  render(<LocationProvider><Probe/></LocationProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Standort aktivieren' }))
  expect(await screen.findByText('allowed:47.37,8.54')).toBeInTheDocument()
  expect(sessionStorage.getItem('explorerx.location.v2')).toContain('47.37')
  expect(localStorage.getItem('explorerx.location.v2')).toBeNull()
})

it('shows a helpful denied state without storing coordinates', async () => {
  setGeolocation((_, failure) => failure?.({ code: 1 } as GeolocationPositionError))
  render(<LocationProvider><Probe/></LocationProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Standort aktivieren' }))
  await waitFor(() => expect(screen.getByText(/denied:Standortzugriff wurde blockiert/)).toBeInTheDocument())
  expect(sessionStorage.getItem('explorerx.location.v2')).toBeNull()
})
