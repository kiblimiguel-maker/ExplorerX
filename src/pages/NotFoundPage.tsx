import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return <section className="empty-state not-found-page">
    <Compass aria-hidden="true" />
    <p className="eyebrow">404</p>
    <h1>Diese Route führt gerade nirgendwohin.</h1>
    <p>Die Seite wurde möglicherweise verschoben oder der Link ist nicht vollständig.</p>
    <Link className="primary-button" to="/map">Zur Karte</Link>
  </section>
}
