import { Camera, X } from 'lucide-react'
import { useRef, type DragEvent } from 'react'

export type PhotoPreview = { file: File; url: string }

type Props = {
  photos: PhotoPreview[]
  disabled?: boolean
  maxBatch?: number
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}

export default function PlacePhotoUploader({ photos, disabled = false, maxBatch = 10, onAdd, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const addFiles = (files: FileList | null) => onAdd(Array.from(files || []))
  const preventFileNavigation = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
  }
  const dropFiles = (event: DragEvent<HTMLDivElement>) => {
    preventFileNavigation(event)
    if (!disabled) addFiles(event.dataTransfer.files)
  }

  return <div className="upload-area" onDragEnter={preventFileNavigation} onDragOver={preventFileNavigation} onDrop={dropFiles}>
    {photos.length > 0 && <div className="photo-previews">{photos.map((photo, index) => <div className="photo-preview" key={photo.url}>
      <img src={photo.url} alt={index === 0 ? 'Foto-Vorschau' : `Foto-Vorschau ${index + 1}`}/>
      <button type="button" disabled={disabled} onClick={() => onRemove(index)} aria-label={index === 0 ? 'Foto entfernen' : `Foto ${index + 1} entfernen`}><X/></button>
    </div>)}</div>}
    {photos.length < maxBatch && <button className="photo-picker" type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>
      <Camera size={28}/><strong>{photos.length ? 'Weitere Fotos hinzufügen' : 'Fotos hier hineinziehen oder auswählen'}</strong>
      <span>Du kannst mehrere Fotos hinzufügen · bis zu {maxBatch} pro Upload · je max. 4 MB</span>
    </button>}
    <input ref={inputRef} className="sr-only" aria-label="Fotos auswählen" type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={disabled} onChange={(event) => {
      addFiles(event.currentTarget.files)
      event.currentTarget.value = ''
    }}/>
  </div>
}
