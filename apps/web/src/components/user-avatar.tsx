import type { AvatarOption } from '../lib/types';
import { Avatar, AvatarFallback, AvatarImage, type AvatarSize } from './ui/avatar';

export function UserAvatar({
  name,
  avatar,
  size = 'default',
  className = '',
}: {
  name: string;
  avatar?: AvatarOption | null;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <Avatar size={size} className={className}>
      {avatar && <AvatarImage src={avatar.imageUrl} alt={`${avatar.name} avatari`} />}
      <AvatarFallback variant="gradient">
        {name
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join('') || '?'}
      </AvatarFallback>
    </Avatar>
  );
}
