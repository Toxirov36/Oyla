import type { AvatarOption } from '../lib/types';
import { Avatar, AvatarFallback, AvatarImage, type AvatarSize } from './ui/avatar';
import { useI18n } from '../i18n';

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
  const { t } = useI18n();
  return (
    <Avatar size={size} className={className}>
      {avatar && (
        <AvatarImage src={avatar.imageUrl} alt={t('profile.avatarAlt', { name: avatar.name })} />
      )}
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
