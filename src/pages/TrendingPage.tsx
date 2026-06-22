import { Bookmark, Camera, Clock3, Crown, Flame, Footprints, Heart, MessageCircle, Sparkles, Star, TrendingUp, UsersRound, Waves } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PremiumEmptyState from '../components/PremiumEmptyState'
import ProductHero from '../components/ProductHero'
import SegmentedControl from '../components/SegmentedControl'
import { usePlaces } from '../context/PlacesContext'
import { useSocial } from '../context/SocialContext'
import { supabase } from '../lib/supabase'
import type { Category, Place } from '../types'

type Trend = Place & { recent_likes?: number; recent_comments?: number; trending_score?: number }
type TrendPeriod = 'today' | 'week' | 'month' | 'all'
type TrendCategory = 'Alle' | 'Baden' | 'Aussicht' | 'Natur' | 'Essen' | 'Schule' | 'Urban' | 'Abenteuer'
const trendCategories: TrendCategory[] = ['Alle', 'Baden', 'Aussicht', 'Natur', 'Essen', 'Schule', 'Urban', 'Abenteuer']
const TRENDING_NOW = Date.now()
const TRENDING_TODAY = new Date(TRENDING_NOW).setHours(0, 0, 0, 0)
const categoryValue = (value: TrendCategory): Category | null => value === 'Alle' ? null : value === 'Urban' ? 'Treffpunkt' : value
const activityScore = (place: Trend) => (place.recent_likes || 0) * 3 + (place.recent_comments || 0) * 2 + place.likes_count + (place.favorites_count || 0) * 2 + (place.visits_count || 0) * .5

const trendBadges = (place: Trend) => {
  const badges: Array<{ label: string; icon: typeof Flame }> = []
  if (place.likes_count >= 20) badges.push({ label: 'Heiss', icon: Flame })
  if ((place.recent_likes || 0) + (place.recent_comments || 0) >= 5) badges.push({ label: 'Steigt schnell', icon: TrendingUp })
  if (place.likes_count < 5) badges.push({ label: 'Geheimtipp', icon: Star })
  if ((place.favorites_count || 0) >= 10) badges.push({ label: 'Community Favorit', icon: UsersRound })
  if ((place.photos_count || 0) >= 3) badges.push({ label: 'Fotospot', icon: Camera })
  if (place.features?.includes('Sonnenuntergang')) badges.push({ label: 'Sunset Spot', icon: Sparkles })
  if (place.category === 'Baden') badges.push({ label: 'Sommertrend', icon: Waves })
  return badges.slice(0, 3)
}

export default function TrendingPage() {
  const { places, toggleLike } = usePlaces()
  const { friendVisitCounts } = useSocial()
  const [cloudTrends, setCloudTrends] = useState<Trend[]>([])
  const [loading, setLoading] = useState(Boolean(supabase))
  const [period, setPeriod] = useState<TrendPeriod>('week')
  const [category, setCategory] = useState<TrendCategory>('Alle')
  useEffect(() => { if (!supabase) return; supabase.from('trending_places').select('*').limit(30).then(({ data }) => { if (data) setCloudTrends(data as Trend[]); setLoading(false) }) }, [])
  const source = useMemo<Trend[]>(() => cloudTrends.length ? cloudTrends : places.map((place) => ({ ...place, recent_likes: 0, recent_comments: 0, trending_score: place.likes_count * .5 })), [cloudTrends, places])
  const ranked = useMemo(() => {
    const periodPlaces = source.filter((place) => period === 'all' || period === 'week' || Date.parse(place.created_at) >= (period === 'today' ? TRENDING_TODAY : TRENDING_NOW - 30 * 86_400_000))
    const categoryFilter = categoryValue(category)
    return periodPlaces.filter((place) => !categoryFilter || place.category === categoryFilter).sort((a, b) => {
      const scoreA = period === 'week' ? Number(a.trending_score || activityScore(a)) : activityScore(a)
      const scoreB = period === 'week' ? Number(b.trending_score || activityScore(b)) : activityScore(b)
      return scoreB - scoreA || b.likes_count - a.likes_count
    })
  }, [category, period, source])
  const topThree = ranked.slice(0, 3)
  const remaining = ranked.slice(3)
  return <div className="content-page trending-page trending-product-page social-product-page">
    <ProductHero
      className="trending-product-hero"
      title="Was die Community gerade bewegt."
      description="Echte Orte im Aufwind – gerankt nach Likes, Gesprächen, gespeicherten Orten und Besuchen."
      aside={<div className="calm-live-indicator"><span/><Flame/><strong>Live Ranking</strong></div>}
    />

    <section className="trending-controls"><SegmentedControl value={period} onChange={setPeriod} label="Zeitraum" options={[{ value: 'today', label: 'Heute neu' }, { value: 'week', label: 'Woche' }, { value: 'month', label: 'Monat' }, { value: 'all', label: 'All Time' }]}/><div className="trend-category-pills">{trendCategories.map((item) => <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div></section>

    {loading ? <div className="trend-skeletons trend-skeletons-premium" role="status"><span/><span/><span/></div> : ranked.length ? <>
      <section className="trend-podium" aria-label="Top drei Orte">{topThree.map((place, index) => { const position = index + 1; const friendCount = friendVisitCounts.get(place.id) || 0; const communitySignals = (place.recent_likes || 0) + (place.recent_comments || 0) + (place.favorites_count || 0) + (place.visits_count || 0) + (place.photos_count || 0); return <article className={`podium-card podium-${position}`} key={place.id}><Link to={`/places/${place.id}`} className="podium-media">{place.image_url ? <img src={place.image_url} alt={place.name} loading={position === 1 ? 'eager' : 'lazy'} decoding="async"/> : <div className="podium-no-photo"><Camera/><span>Noch kein Community-Foto</span></div>}<span className="podium-rank"><Crown/> {['Gold', 'Silber', 'Bronze'][index]}</span><div className="podium-gradient"/></Link><div className="podium-copy"><div><span>{place.category}</span><h2>{place.name}</h2></div><strong className="trend-activity-label"><TrendingUp/><span>{communitySignals}<small>Community-Signale</small></span></strong><div className="trend-score-grid"><span><Heart/>{place.likes_count}</span><span><MessageCircle/>{place.comments_count || place.recent_comments || 0}</span><span><Bookmark/>{place.favorites_count || 0}</span><span><Footprints/>{place.visits_count || 0}</span></div>{friendCount > 0 && <p className="trend-friends"><UsersRound/>{friendCount} {friendCount === 1 ? 'Freund war' : 'Freunde waren'} hier</p>}<div className="trend-badges">{trendBadges(place).map(({ label, icon: Icon }) => <span key={label}><Icon/>{label}</span>)}</div><Link className="podium-open" to={`/places/${place.id}`}>Ort entdecken</Link></div></article> })}</section>

      {remaining.length > 0 && <section className="trend-ranking"><div className="community-heading"><div><h2>Weitere Orte im Aufwind</h2><p>Mehr Orte mit echter Community-Aktivität.</p></div><span>{remaining.length}</span></div>{remaining.map((place, index) => <article className="trend-ranking-row" key={place.id}><span className="trend-row-rank">{index + 4}</span><Link to={`/places/${place.id}`} className="trend-row-image">{place.image_url ? <img src={place.image_url} alt={place.name} loading="lazy" decoding="async"/> : <Camera/>}</Link><div className="trend-row-copy"><span>{place.category}</span><Link to={`/places/${place.id}`}>{place.name}</Link><div>{trendBadges(place).map(({ label, icon: Icon }) => <span key={label}><Icon/>{label}</span>)}</div></div><div className="trend-row-bars"><span><i style={{ width: `${Math.min(100, place.likes_count)}%` }}/><Heart/>{place.likes_count}</span><span><i style={{ width: `${Math.min(100, (place.comments_count || 0) * 5)}%` }}/><MessageCircle/>{place.comments_count || 0}</span></div><button className="like-button" onClick={() => toggleLike(place.id)} aria-label={`${place.name} liken`}><Heart/>{place.likes_count}</button></article>)}</section>}
    </> : <PremiumEmptyState icon={period === 'today' ? <Clock3/> : <Flame/>} title="Für diesen Zeitraum gibt es noch keinen Trend" description="ExplorerX zeigt hier erst Orte, wenn echte Community-Aktivität oder neue Orte vorhanden sind."/>}
  </div>
}
