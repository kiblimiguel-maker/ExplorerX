import { Map, Navigation } from 'lucide-react'

export default function RouteLinks({ latitude, longitude }: { latitude: number; longitude: number }) {
  const destination = `${latitude},${longitude}`
  return <div className="route-links"><a className="secondary-button" href={`https://www.google.com/maps/dir/?api=1&destination=${destination}`} target="_blank" rel="noreferrer"><Navigation/> Route starten</a><a className="map-provider-link" href={`https://maps.apple.com/?daddr=${destination}&dirflg=w`} target="_blank" rel="noreferrer" aria-label="Route mit Apple Karten öffnen"><Map/> Apple Karten</a></div>
}
