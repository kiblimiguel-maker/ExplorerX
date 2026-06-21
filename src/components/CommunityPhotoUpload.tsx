import { Camera, CheckCircle2, LoaderCircle, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PlacePhotoUploader, { type PhotoPreview } from './PlacePhotoUploader'
import { deleteOwnCommunityPhoto, uploadCommunityPhotos, validateCommunityPhotos, type CommunityPhoto } from '../lib/communityPhotos'

type Props = {
  placeId: string
  userId?: string
  photos: CommunityPhoto[]
  onUploaded: (photos: CommunityPhoto[]) => void
  onDeleted: (photo: CommunityPhoto) => void
}

export default function CommunityPhotoUpload({ placeId, userId, photos, onUploaded, onDeleted }: Props) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<PhotoPreview[]>([])
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const selectedRef = useRef(selected)
  useEffect(() => { selectedRef.current = selected }, [selected])
  useEffect(() => () => selectedRef.current.forEach((photo) => URL.revokeObjectURL(photo.url)), [])

  const addFiles = (files: File[]) => {
    setError(''); setMessage('')
    const combined = [...selected.map((photo) => photo.file), ...files]
    try { validateCommunityPhotos(combined) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Die Fotos sind ungültig.'); return }
    setSelected((current) => [...current, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))])
  }
  const removeSelected = (index: number) => setSelected((current) => { URL.revokeObjectURL(current[index].url); return current.filter((_, itemIndex) => itemIndex !== index) })
  const upload = async () => {
    setError(''); setMessage('')
    try { validateCommunityPhotos(selected.map((photo) => photo.file)) }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Wähle mindestens ein Foto aus.'); return }
    setUploading(true); setProgress(`0 von ${selected.length} Fotos hochgeladen`)
    try {
      const uploaded = await uploadCommunityPhotos(placeId, selected.map((photo) => photo.file), (done, total) => setProgress(`${done} von ${total} Fotos hochgeladen`))
      selected.forEach((photo) => URL.revokeObjectURL(photo.url))
      setSelected([]); setOpen(false); setProgress(''); setMessage(uploaded.length === 1 ? 'Foto erfolgreich hinzugefügt.' : `${uploaded.length} Fotos erfolgreich hinzugefügt.`)
      onUploaded(uploaded)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Der Upload ist fehlgeschlagen.') }
    finally { setUploading(false) }
  }
  const removeExisting = async (photo: CommunityPhoto) => {
    if (!window.confirm('Dieses Foto endgültig löschen?')) return
    setError(''); setMessage('')
    try { await deleteOwnCommunityPhoto(photo); onDeleted(photo); setMessage('Foto gelöscht.') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Das Foto konnte nicht gelöscht werden.') }
  }

  if (!userId) return <div className="community-photo-login"><Camera/><span><strong>Eigene Perspektive teilen</strong>Melde dich an, um Fotos hinzuzufügen.</span><Link to="/login">Anmelden</Link></div>
  const ownPhotos = photos.filter((photo) => photo.uploaded_by === userId)
  return <section className="community-photo-upload">
    <button className="community-photo-trigger" type="button" onClick={() => { setOpen((current) => !current); setError(''); setMessage('') }}><Camera/>{open ? 'Auswahl schliessen' : 'Foto hinzufügen'}</button>
    {open && <div className="community-photo-panel"><div className="community-photo-heading"><div><Camera/><span><strong>Fotos zur Community-Galerie</strong><small>Beliebig viele Fotos, in übersichtlichen 10er-Batches.</small></span></div><button type="button" onClick={() => setOpen(false)} aria-label="Fotoauswahl schliessen"><X/></button></div><PlacePhotoUploader photos={selected} disabled={uploading} maxBatch={10} onAdd={addFiles} onRemove={removeSelected}/>{progress && <p className="upload-status" role="status"><LoaderCircle className="spin"/>{progress}</p>}<button className="primary-button community-upload-submit" type="button" disabled={uploading || !selected.length} onClick={() => void upload()}>{uploading ? <LoaderCircle className="spin"/> : <Camera/>}{uploading ? 'Wird hochgeladen…' : `${selected.length || ''} ${selected.length === 1 ? 'Foto hochladen' : 'Fotos hochladen'}`}</button></div>}
    {ownPhotos.length > 0 && <div className="own-photo-list"><strong>Deine Fotos</strong><div>{ownPhotos.map((photo) => <span key={photo.id}><img src={photo.url} alt="Dein Beitrag"/><button type="button" onClick={() => void removeExisting(photo)} aria-label="Eigenes Foto löschen"><Trash2/></button></span>)}</div></div>}
    {message && <p className="community-photo-success" role="status"><CheckCircle2/>{message}</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
  </section>
}
