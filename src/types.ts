export const categories = ['Sport', 'Baden', 'Natur', 'Aussicht', 'Essen', 'Schule', 'Treffpunkt', 'Abenteuer', 'Sonstiges'] as const
export type Category = (typeof categories)[number]
export const placeFeatures = ['Kostenlos', 'Familienfreundlich', 'Parkplatz', 'Hund erlaubt', 'Sonnenuntergang', 'Indoor', 'Outdoor'] as const
export type PlaceFeature = (typeof placeFeatures)[number]

export type Place = {
  id: string
  name: string
  description: string
  category: Category
  latitude: number
  longitude: number
  address?: string
  image_url?: string
  likes_count: number
  created_by: string | null
  created_at: string
  status: 'active' | 'reported' | 'hidden'
  features?: PlaceFeature[]
  rating_average?: number
  ratings_count?: number
  favorites_count?: number
  comments_count?: number
  photos_count?: number
  visits_count?: number
  creator?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}

export type NewPlace = Omit<Place, 'id' | 'likes_count' | 'created_at' | 'status' | 'created_by' | 'rating_average' | 'ratings_count'> & { photos?: File[] }
export type Coordinates = { latitude: number; longitude: number }

export type Profile = {
  id: string
  display_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
}

export type ProfileStats = {
  places: number
  likesReceived: number
  visited: number
  photos: number
  comments: number
  favorites: number
  xp: number
  badenActivity: number
  schoolActivity: number
}
export type Achievement = { id: string; title: string; description: string; unlocked: boolean; progress: number; target: number }
export type Comment = {
  id: string
  place_id: string
  user_id: string
  body: string
  created_at: string
  edited_at: string | null
  author?: Pick<Profile, 'display_name' | 'avatar_url'> | null
}

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected'
export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
  updated_at: string
  requester?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
  addressee?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'> | null
}
