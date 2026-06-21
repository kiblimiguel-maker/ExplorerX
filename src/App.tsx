import { lazy, Suspense, type ReactNode } from 'react'
import { Bell, Compass, Map, Plus, ShieldCheck, UserRound, X } from 'lucide-react'
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { usePlaces } from './context/PlacesContext'
import { useSocial } from './context/SocialContext'
import { missingSupabaseVariables } from './lib/supabase'
import { PageSkeleton } from './components/Skeleton'
import Onboarding from './components/Onboarding'
import RequireAdmin from './components/RequireAdmin'

const HomePage = lazy(() => import('./pages/HomePage'))
const DiscoverPage = lazy(() => import('./pages/DiscoverPage'))
const MapPage = lazy(() => import('./pages/MapPage'))
const PlaceDetailPage = lazy(() => import('./pages/PlaceDetailPage'))
const TrendingPage = lazy(() => import('./pages/TrendingPage'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const AddPlacePage = lazy(() => import('./pages/AddPlacePage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))
const AuthCallbackPage = lazy(() => import('./pages/AuthCallbackPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const FriendsPage = lazy(() => import('./pages/FriendsPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSocial(); const location = useLocation()
  if (isLoading) return <PageSkeleton/>
  return user ? children : <Navigate to="/login" replace state={{ from: location.pathname }}/>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSocial()
  if (isLoading) return <PageSkeleton/>
  return user ? <Navigate to="/map" replace/> : children
}

const links = [
  { to: '/discover', label: 'Entdecken', icon: Compass },
  { to: '/map', label: 'Karte', icon: Map },
  { to: '/friends', label: 'Aktivität', icon: Bell },
]

export default function App() {
  const { notice, clearNotice, dataMode } = usePlaces()
  const { message, clearMessage, user, isAdmin } = useSocial()
  return <div className="app-shell">
    <header className="topbar">
      <NavLink className="brand" to="/"><img className="brand-icon" src="/icons/icon-192.png" alt=""/><strong>Explorer<span>X</span></strong><span className="tagline">Rausgehen. Neues entdecken.</span></NavLink>
      <nav className="desktop-nav">{links.map(({ to, label, icon: Icon }) => <NavLink to={to} key={to}><Icon size={19}/>{label}</NavLink>)}</nav>
      <NavLink className="primary-button compact" to="/add"><Plus size={18}/> Ort hinzufügen</NavLink>
      {isAdmin && <NavLink className="profile-link profile-link-labeled admin-link" to="/admin"><ShieldCheck size={19}/><span>Admin</span></NavLink>}
      <NavLink className="profile-link profile-link-labeled" to={user ? '/profile' : '/login'}><UserRound size={19}/><span>{user ? 'Profil' : 'Anmelden'}</span></NavLink>
    </header>
    {dataMode === 'demo' && <div className="mode-banner" role="alert"><strong>Demo-Modus:</strong> Supabase fehlt ({missingSupabaseVariables.join(', ')}). Änderungen bleiben nur in diesem Browser.</div>}
    {dataMode === 'offline' && <div className="mode-banner mode-banner-error" role="alert"><strong>Offline-Modus:</strong> Supabase ist nicht erreichbar. ExplorerX zeigt die letzte lokale Kopie.</div>}
    {notice && <div className={`notice-bar notice-${notice.type}`} role="status"><span>{notice.message}</span><button onClick={clearNotice} aria-label="Hinweis schliessen"><X size={17}/></button></div>}
    {message && <div className="notice-bar notice-info" role="status"><span>{message}</span><button onClick={clearMessage} aria-label="Hinweis schliessen"><X size={17}/></button></div>}
    <main><Suspense fallback={<PageSkeleton/>}><Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/discover" element={<DiscoverPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/places/:id" element={<PlaceDetailPage />} />
      <Route path="/popular" element={<TrendingPage />} />
      <Route path="/trending" element={<TrendingPage />} />
      <Route path="/favorites" element={<RequireAuth><FavoritesPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />
      <Route path="/friends" element={<RequireAuth><FriendsPage /></RequireAuth>} />
      <Route path="/add" element={<RequireAuth><AddPlacePage /></RequireAuth>} />
      <Route path="/login" element={<PublicOnly><AuthPage /></PublicOnly>} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/admin" element={<RequireAdmin><AdminPage/></RequireAdmin>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense></main>
    <Onboarding/>
    <nav className="mobile-nav"><NavLink to="/discover"><Compass size={21}/><span>Entdecken</span></NavLink><NavLink to="/map"><Map size={21}/><span>Karte</span></NavLink><NavLink className="mobile-add-action" to="/add"><Plus size={22}/><span>Hinzufügen</span></NavLink><NavLink to="/friends"><Bell size={21}/><span>Aktivität</span></NavLink><NavLink to={user ? '/profile' : '/login'}><UserRound size={21}/><span>Profil</span></NavLink></nav>
  </div>
}
