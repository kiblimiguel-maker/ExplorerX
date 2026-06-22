import { Binoculars, CircleEllipsis, Coffee, Footprints, Leaf, Mountain, PersonStanding, School, Waves } from 'lucide-react'
import type { Category } from '../types'

const icons = { Sport: PersonStanding, Baden: Waves, Natur: Leaf, Aussicht: Mountain, Essen: Coffee, Schule: School, Treffpunkt: Footprints, Abenteuer: Binoculars, Sonstiges: CircleEllipsis }
export default function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) { const Icon = icons[category]; return <Icon size={size} /> }
