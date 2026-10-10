import { translate as tx } from '../i18n';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { localeTags, useI18n } from '../i18n';
import {
  ChevronRight,
  LoaderCircle,
  LogOut,
  Settings2,
  Sparkles,
  UserRound,
  Shield,
  GraduationCap,
  BookOpen,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface HeaderUserMenuProps {
  name: string;
  secondaryInfo: string;
  email?: string;
  role?: string;
  avatarUrl?: string;
  onSignOut: () => Promise<void>;
  profileHref?: string;
  settingsHref?: string;
  className?: string;
}

function getRoleBadgeConfig(secondaryInfo: string, role?: string) {
  const text = (secondaryInfo + ' ' + (role || '')).toLowerCase();
  if (text.includes('admin')) {
    return {
      className: 'role-admin',
      icon: Shield,
    };
  }
  if (
    text.includes(tx('pages.header-user-menu.teacher')) ||
    text.includes("o'qituvchi") ||
    text.includes('teacher')
  ) {
    return {
      className: 'role-teacher',
      icon: GraduationCap,
    };
  }
  if (
    text.includes(tx('pages.header-user-menu.student')) ||
    text.includes("o'quvchi") ||
    text.includes('student')
  ) {
    return {
      className: 'role-student',
      icon: BookOpen,
    };
  }
  return {
    className: 'role-default',
    icon: Sparkles,
  };
}

export function HeaderUserMenu({
  name,
  secondaryInfo,
  email,
  role,
  avatarUrl,
  onSignOut,
  profileHref = '/profile',
  settingsHref = '/profile#settings',
  className = '',
}: HeaderUserMenuProps) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const descriptionId = useId();
  const initial = Array.from(name.trim())[0]?.toLocaleUpperCase(localeTags[locale]) || '?';
  const roleConfig = getRoleBadgeConfig(secondaryInfo, role);
  const RoleIcon = roleConfig.icon;

  const logout = async () => {
    setSigningOut(true);
    setError('');
    try {
      await onSignOut();
      setOpen(false);
    } catch {
      setError('menu.signOutError');
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`user-profile-nav ${className}`}
          aria-label={t('menu.trigger', { name })}
          aria-describedby={descriptionId}
          title={`${name} (${secondaryInfo})`}
          disabled={signingOut}
        >
          <div className="user-avatar-ring-wrap">
            <div className="user-avatar-gradient-ring">
              <div className="user-avatar-inner">
                <Avatar size="lg" className="user-menu-avatar" aria-hidden="true">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                  <AvatarFallback variant="gradient">{initial}</AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
          <span className="sr-only">
            <span className="user-menu-name">{name}</span>
            <span className="user-menu-role" id={descriptionId}>
              <span className={`user-menu-role-badge ${roleConfig.className}`}>
                <RoleIcon size={11} className="role-icon" aria-hidden="true" />
                <span>{secondaryInfo}</span>
              </span>
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="user-menu-content"
        align="end"
        sideOffset={8}
        collisionPadding={12}
      >
        <div className="user-menu-header">
          <div className="user-avatar-gradient-ring user-avatar-menu-header-ring">
            <div className="user-avatar-inner">
              <Avatar size="lg" className="user-menu-header-avatar" aria-hidden="true">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
                <AvatarFallback variant="gradient">{initial}</AvatarFallback>
              </Avatar>
            </div>
          </div>
          <div className="user-menu-header-info">
            <span className="user-menu-header-name" title={name}>
              {name}
            </span>
            {email ? (
              <span className="user-menu-header-email" title={email}>
                {email}
              </span>
            ) : (
              <span className={`user-menu-role-badge ${roleConfig.className}`}>
                <RoleIcon size={10} aria-hidden="true" />
                <span>{secondaryInfo}</span>
              </span>
            )}
          </div>
        </div>

        <DropdownMenuSeparator className="user-menu-separator" />

        <DropdownMenuItem asChild>
          <Link to={profileHref} className="user-menu-item">
            <span className="user-menu-item-icon" aria-hidden="true">
              <UserRound size={16} />
            </span>
            <span>{t('menu.profile')}</span>
            <ChevronRight size={14} className="user-menu-item-arrow" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link to={settingsHref} className="user-menu-item">
            <span className="user-menu-item-icon" aria-hidden="true">
              <Settings2 size={16} />
            </span>
            <span>{t('menu.settings')}</span>
            <ChevronRight size={14} className="user-menu-item-arrow" aria-hidden="true" />
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="user-menu-separator" />

        <DropdownMenuItem
          className="user-menu-item user-menu-logout"
          disabled={signingOut}
          onSelect={(event) => {
            event.preventDefault();
            void logout();
          }}
        >
          <span className="user-menu-item-icon user-menu-item-icon-danger" aria-hidden="true">
            {signingOut ? <LoaderCircle size={16} className="spin" /> : <LogOut size={16} />}
          </span>
          <span>{t(signingOut ? 'common.signingOut' : 'common.signOut')}</span>
        </DropdownMenuItem>

        {error && (
          <p className="user-menu-error" role="alert">
            {t(error)}
          </p>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
