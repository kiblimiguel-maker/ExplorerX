import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useSocial } from '../context/SocialContext'
import { PageSkeleton } from './Skeleton'

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isAdmin, isLoading } = useSocial()
  const location = useLocation()
  if (isLoading) return <PageSkeleton/>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }}/>
  if (!isAdmin) return <Navigate to="/map" replace/>
  return children
}
