import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChartNoAxesCombined,
  GraduationCap,
  House,
  Layers,
  Menu,
  Settings2,
  Trophy,
  Users,
  ClipboardList,
  Zap,
  UserRound,
  Gamepad2,
  Clapperboard,
} from 'lucide-react';
import { homeFor, useAuth } from '../lib/auth';
import { Button } from './ui';
import { NotificationBell } from './notification-bell';
import { HeaderUserMenu } from './header-user-menu';
import { brand } from '../lib/brand';
import { useI18n } from '../i18n';
import { LanguageSwitcher } from './language-switcher';

const studentNav = [
  { to: '/dashboard', label: 'navigation.home', icon: House },
  { to: '/subjects', label: 'navigation.subjects', icon: BookOpen },
  { to: '/challenge', label: 'navigation.challenge', icon: Zap },
  { to: '/progress', label: 'navigation.progress', icon: ChartNoAxesCombined },
  { to: '/my-class', label: 'navigation.class', icon: GraduationCap },
  { to: '/leaderboard', label: 'navigation.leaderboard', icon: Trophy },
  { to: '/friends', label: 'navigation.friends', icon: Users },
  { to: '/badges', label: 'navigation.badges', icon: Award },
  { to: '/assignments', label: 'navigation.assignments', icon: ClipboardList },
  { to: '/games', label: 'navigation.games', icon: Gamepad2 },
  { to: '/videos', label: 'navigation.videos', icon: Clapperboard },
];
const teacherNav = [
  { to: '/teacher', label: 'navigation.classes', icon: GraduationCap },
  { to: '/teacher/assignments', label: 'navigation.assignments', icon: ClipboardList },
];
const adminNav = [
  { to: '/admin', label: 'navigation.overview', icon: House },
  { to: '/admin/content', label: 'navigation.content', icon: Layers },
  { to: '/admin/users', label: 'navigation.users', icon: Users },
  { to: '/admin/classes', label: 'navigation.adminClasses', icon: GraduationCap },
  { to: '/admin/gamification', label: 'navigation.gamification', icon: Settings2 },
  { to: '/admin/avatars', label: 'navigation.avatars', icon: UserRound },
  { to: '/admin/videos', label: 'navigation.videos', icon: Clapperboard },
  { to: '/admin/memory', label: 'navigation.memoryAdmin', icon: Gamepad2 },
];
const adminTeacherNav = [...adminNav, ...teacherNav];
export function Logo() {
  return (
    <span className="logo" role="img" aria-label={brand.name}>
      <span className={brand.logo.showWordmark ? 'logo-symbol' : 'brand-logo-full'}>
        <img
          className="brand-logo-light"
          src={brand.logo.light}
          alt=""
          width={brand.logo.width}
          height={brand.logo.height}
        />
        <img
          className="brand-logo-dark"
          src={brand.logo.dark}
          alt=""
          width={brand.logo.width}
          height={brand.logo.height}
        />
      </span>
      {brand.logo.showWordmark && (
        <>
          {brand.wordmark}
          <span className="logo-dot">{brand.wordmarkSuffix}</span>
        </>
      )}
    </span>
  );
}
export function AppShell() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState(false);
  const nav =
    user!.role === 'STUDENT'
      ? studentNav
      : user!.role === 'TEACHER'
        ? teacherNav
        : user!.teacherAccess
          ? adminTeacherNav
          : adminNav;
  const roleLabel =
    user!.role === 'STUDENT'
      ? t('role.studentGrade', { grade: user!.student?.grade })
      : user!.role === 'TEACHER'
        ? t('role.TEACHER')
        : user!.teacherAccess
          ? t('role.adminTeacher')
          : t('role.ADMIN');
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        {t('navigation.skip')}
      </a>
      <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
        <Link
          to={homeFor(user!)}
          className="brand"
          aria-label={t('navigation.homeLabel', { brand: brand.name })}
        >
          <Logo />
        </Link>
        <p className="brand-tagline">{t('brand.tagline')}</p>
        <div className="nav-label">{t('navigation.area')}</div>
        <nav aria-label={t('navigation.main')}>
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/teacher' || to === '/admin'}
              onClick={() => setMenu(false)}
            >
              <Icon size={20} />
              <span>{t(label)}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label={t('navigation.openMenu')}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </Button>
            <span className="platform-label">{t('navigation.platformLabel')}</span>
          </div>
          <div className="topbar-actions">
            <LanguageSwitcher />
            <NotificationBell />
            <HeaderUserMenu
              name={user!.name}
              avatarUrl={user?.avatar?.imageUrl}
              secondaryInfo={roleLabel}
              email={user?.email}
              role={user?.role}
              onSignOut={signOut}
            />
          </div>
        </div>
        <main id="main" className="page-content">
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>
            © {new Date().getFullYear()} {brand.name}
          </span>
          <span>{t('navigation.footer')}</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label={t('navigation.mobile')}>
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink to={to} key={to} end={['/dashboard', '/teacher', '/admin'].includes(to)}>
            <Icon size={21} />
            <span>{t(label).split(' ').at(-1)}</span>
          </NavLink>
        ))}
        <button
          onClick={() => setMenu(!menu)}
          aria-label={t('navigation.allPages')}
          aria-expanded={menu}
        >
          <Menu size={21} />
          <span>{t('navigation.menu')}</span>
        </button>
      </nav>
    </div>
  );
}
