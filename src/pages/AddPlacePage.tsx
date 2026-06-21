import { Check, LocateFixed, LoaderCircle, MapPin, ShieldCheck, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import { usePlaces } from '../context/PlacesContext'
import { categories, placeFeatures, type Category, type Coordinates, type PlaceFeature } from '../types'
import { isPrivateAddress } from '../lib/validation'
import PlacePhotoUploader, { type PhotoPreview } from '../components/PlacePhotoUploader'

export default function AddPlacePage() {
  const { addPlace } = usePlaces()
  const navigate = useNavigate()
  const [position, setPosition] = useState<Coordinates | null>(null)
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [features, setFeatures] = useState<Set<PlaceFeature>>(new Set(['Outdoor']))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locationMessage, setLocationMessage] = useState('')
  const [locationError, setLocationError] = useState('')
  const [uploadStatus, setUploadStatus] = useState('')
  const photosRef = useRef(photos)
  useEffect(() => { photosRef.current = photos }, [photos])

  useEffect(() => {
    const preventFileNavigation = (event: DragEvent) => {
      if (Array.from(event.dataTransfer?.types || []).includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', preventFileNavigation)
    window.addEventListener('drop', preventFileNavigation)
    return () => {
      window.removeEventListener('dragover', preventFileNavigation)
      window.removeEventListener('drop', preventFileNavigation)
      photosRef.current.forEach((photo) => URL.revokeObjectURL(photo.url))
    }
  }, [])

  const onPhotos = (files: File[]) => {
    setError('')
    const remaining = 10 - photos.length
    const selected = files.slice(0, remaining)
    if (!selected.length) return
    if (files.length > remaining) {
      setError('Pro Upload sind höchstens 10 Fotos erlaubt. Nach dem Erstellen kannst du beliebig viele weitere hinzufügen.')
      return
    }
    const invalidTypes = selected.filter((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)).map((file) => file.name)
    const tooLarge = selected.filter((file) => file.size > 4_000_000).map((file) => file.name)
    if (invalidTypes.length || tooLarge.length) return setError([invalidTypes.length ? `${invalidTypes.join(', ')}: Nur JPG, PNG oder WebP.` : '', tooLarge.length ? `${tooLarge.join(', ')}: Maximal 4 MB pro Bild.` : ''].filter(Boolean).join(' '))
    setPhotos((current) => [...current, ...selected.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const removePhoto = (index: number) => setPhotos((current) => { URL.revokeObjectURL(current[index].url); return current.filter((_, itemIndex) => itemIndex !== index) })
  const toggleFeature = (feature: PlaceFeature) => setFeatures((current) => { const next = new Set(current); if (next.has(feature)) next.delete(feature); else next.add(feature); return next })
  const pickPosition = (next: Coordinates) => {
    setPosition(next)
    setLocationError('')
    setLocationMessage('Position auf der Karte gesetzt.')
  }
  const useCurrentLocation = () => {
    setLocationError('')
    setLocationMessage('')
    if (!navigator.geolocation) {
      setLocationError('Standortdienste sind in diesem Browser nicht verfügbar. Setze den Ort bitte manuell auf der Karte.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition((result) => {
      setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude })
      setLocationMessage('Aktueller Standort übernommen. Prüfe die Position vor dem Veröffentlichen.')
      setLocating(false)
    }, (locationError) => {
      const blocked = locationError.code === locationError.PERMISSION_DENIED
      setLocationError(blocked
        ? 'Standortzugriff wurde blockiert. Setze den Ort bitte manuell auf der Karte.'
        : 'Der aktuelle Standort konnte nicht ermittelt werden. Setze den Ort bitte manuell auf der Karte.')
      setLocating(false)
    }, { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 })
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    const data = new FormData(event.currentTarget)
    const name = String(data.get('name') || '').trim()
    const description = String(data.get('description') || '').trim()
    const address = String(data.get('address') || '').trim()
    if (name.length < 3) return setError('Der Name muss mindestens 3 Zeichen lang sein.')
    if (description.length < 15) return setError('Beschreibe den Ort bitte mit mindestens 15 Zeichen.')
    if (!position) return setError('Setze den Ort bitte auf der Karte.')
    if (isPrivateAddress(address)) return setError('Bitte keine private Hausnummer angeben. Ein öffentlicher Ortsname reicht.')
    setSaving(true)
    setUploadStatus(photos.length ? `0 von ${photos.length} Fotos hochgeladen` : 'Ort wird gespeichert…')
    try {
      const place = await addPlace({ name, description, category: data.get('category') as Category, address: address || undefined, latitude: position.latitude, longitude: position.longitude, photos: photos.map((item) => item.file), features: [...features] }, (uploaded, total) => setUploadStatus(`${uploaded} von ${total} Fotos hochgeladen`))
      navigate(`/places/${place.id}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Der Ort konnte gerade nicht gespeichert werden. Bitte versuche es erneut.')
    } finally {
      setSaving(false)
      setUploadStatus('')
    }
  }

  return <div className="add-page">
    <div className="page-title"><div><h1>Neuen Ort teilen</h1><p>Hilf anderen, draussen etwas Neues zu entdecken.</p></div></div>
    <div className="privacy-warning"><ShieldCheck size={20}/><span><strong>Nur öffentliche Orte.</strong> Poste keine privaten Wohnadressen, Live-Standorte oder Bilder von Personen ohne Erlaubnis.</span></div>
    <form className="add-layout" onSubmit={submit}>
      <div className="form-panel">
        <label>Name des Ortes<input name="name" maxLength={80} placeholder="z.B. Basketballplatz am Fluss" required/></label>
        <label>Kategorie<select name="category" required>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
        <label>Beschreibung<textarea name="description" maxLength={600} rows={5} placeholder="Was macht diesen Ort besonders? Was kann man dort machen?" required/></label>
        <label>Öffentliche Adresse oder Ortsname<input name="address" maxLength={120} placeholder="z.B. Josefwiese, Zürich"/><small>Keine privaten Hausnummern oder Wohnadressen.</small></label>
        <fieldset className="feature-picker"><legend>Ausstattung und Eigenschaften</legend>{placeFeatures.map((feature) => <label key={feature}><input type="checkbox" checked={features.has(feature)} onChange={() => toggleFeature(feature)}/><span>{feature}</span></label>)}</fieldset>
        <PlacePhotoUploader photos={photos} disabled={saving} maxBatch={10} onAdd={onPhotos} onRemove={removePhoto}/>
        <div className="form-safety"><ShieldCheck size={20}/><span>Teile nur öffentliche Orte und Bilder, die du verwenden darfst.</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {uploadStatus && <p className="upload-status" role="status">{uploadStatus}</p>}
        <button className="primary-button submit-button" disabled={saving}><Upload size={18}/>{saving ? 'Wird gespeichert…' : 'Ort veröffentlichen'}</button>
      </div>
      <div className="map-picker">
        <div className="picker-heading"><div><MapPin size={19}/><strong>Position setzen</strong></div>{position && <span><Check size={15}/> Gesetzt</span>}</div>
        <p>Nutze deinen aktuellen Standort oder markiere den öffentlichen Ort direkt auf der Karte.</p>
        <button className="picker-location-button" type="button" onClick={useCurrentLocation} disabled={locating || saving}>{locating ? <LoaderCircle className="spin" size={18}/> : <LocateFixed size={18}/>} {locating ? 'Standort wird ermittelt…' : 'Aktuellen Standort verwenden'}</button>
        {locationMessage && <p className="location-success" role="status"><Check size={16}/>{locationMessage}</p>}
        {locationError && <p className="form-error location-error" role="alert">{locationError}</p>}
        <MapView places={[]} picked={position} onPick={pickPosition}/>
        {position && <small>{position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</small>}
      </div>
    </form>
  </div>
}
