import { render, screen } from '@testing-library/react'
import PlacePhotoUploader from './PlacePhotoUploader'

describe('PlacePhotoUploader', () => {
  it('keeps dropped images in the form instead of navigating the browser', () => {
    const onAdd = vi.fn()
    const photo = new File(['photo'], 'fluss.webp', { type: 'image/webp' })
    render(<PlacePhotoUploader photos={[]} onAdd={onAdd} onRemove={vi.fn()}/>)
    const picker = screen.getByRole('button', { name: /Fotos hinzufügen/ }).parentElement as HTMLElement
    const dropEvent = new Event('drop', { bubbles: true, cancelable: true })
    Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [photo] } })
    picker.dispatchEvent(dropEvent)
    expect(dropEvent.defaultPrevented).toBe(true)
    expect(onAdd).toHaveBeenCalledWith([photo])
  })

  it('limits accepted selection in the native picker to supported image types', () => {
    render(<PlacePhotoUploader photos={[]} onAdd={vi.fn()} onRemove={vi.fn()}/>)
    expect(screen.getByLabelText('Fotos auswählen')).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp')
  })
})
