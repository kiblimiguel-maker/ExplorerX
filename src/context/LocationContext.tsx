import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Coordinates } from '../types'

export type LocationStatus = 'unknown' | 'asked' | 'allowed' | 'denied' | 'error'

type StoredLocation = { status: LocationStatus; location: Coordinates | null }
type LocationContextValue = StoredLocation & {
  error: string
  requestLocation: () => Promise<Coordinates | null>
  clearLocationError: () => void
}

const STORAGE_KEY = 'explorerx.location.v2'
const readStoredLocation = (): StoredLocation => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as StoredLocation | null
    return stored?.status === 'allowed' && stored.location ? stored : { status: 'unknown', location: null }
  } catch {
    return { status: 'unknown', location: null }
  }
}

const LocationContext = createContext<LocationContextValue | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => readStoredLocation())
  const [status, setStatus] = useState<LocationStatus>(initial.status)
  const [location, setLocation] = useState<Coordinates | null>(initial.location)
  const [error, setError] = useState('')

  const requestLocation = useCallback(() => new Promise<Coordinates | null>((resolve) => {
    setStatus('asked')
    setError('')
    if (!navigator.geolocation) {
      setStatus('error')
      setError('Standortdienste sind in diesem Browser nicht verfügbar. Suche stattdessen nach einer Stadt oder setze den Ort auf der Karte.')
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition((result) => {
      const next = { latitude: result.coords.latitude, longitude: result.coords.longitude }
      setLocation(next)
      setStatus('allowed')
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ status: 'allowed', location: next }))
      resolve(next)
    }, (cause) => {
      const denied = cause.code === 1
      setStatus(denied ? 'denied' : 'error')
      setLocation(null)
      setError(denied
        ? 'Standortzugriff wurde blockiert. Suche stattdessen nach einer Stadt oder Region.'
        : 'Dein Standort konnte gerade nicht ermittelt werden. Versuche es erneut oder nutze die manuelle Suche.')
      sessionStorage.removeItem(STORAGE_KEY)
      resolve(null)
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 })
  }), [])

  const clearLocationError = useCallback(() => {
    setError('')
    if (status === 'denied' || status === 'error') setStatus('unknown')
  }, [status])
  const value = useMemo(() => ({ status, location, error, requestLocation, clearLocationError }), [clearLocationError, error, location, requestLocation, status])
  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocationStatus() {
  const value = useContext(LocationContext)
  if (!value) throw new Error('useLocationStatus must be used within LocationProvider')
  return value
}
