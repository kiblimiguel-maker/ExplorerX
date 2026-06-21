import type { CommunityProfile } from '../lib/placeCommunity'
import UserAvatar from './UserAvatar'

export default function AvatarGroup({ profiles, label = 'Community' }: { profiles: CommunityProfile[]; label?: string }) {
  if (!profiles.length) return null
  return (
    <div className="avatar-group-wrap" aria-label={label}>
      <div className="avatar-group">
        {profiles.slice(0, 4).map((profile) => (
          <UserAvatar className="micro" key={profile.id} url={profile.avatar_url} name={profile.display_name}/>
        ))}
      </div>
      <span>{label}</span>
    </div>
  )
}
