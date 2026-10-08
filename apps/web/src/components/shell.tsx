import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChartNoAxesCombined,
  GraduationCap,
  House,
  Layers,
  LogOut,
  Menu,
  Settings2,
  Sparkles,
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

const studentNav = [
  { to: '/dashboard', label: 'Bosh sahifa', icon: House },
  { to: '/subjects', label: 'Mening fanlarim', icon: BookOpen },
  { to: '/challenge', label: 'Kunlik challenge', icon: Zap },
  { to: '/progress', label: 'Mening progressim', icon: ChartNoAxesCombined },
  { to: '/my-class', label: 'Mening sinfim', icon: GraduationCap },
  { to: '/leaderboard', label: 'Reyting', icon: Trophy },
  { to: '/friends', label: 'Do‘stlarim', icon: Users },
  { to: '/badges', label: 'Nishonlar', icon: Award },
  { to: '/assignments', label: 'Topshiriqlar', icon: ClipboardList },
  { to: '/games', label: 'O‘yinlar', icon: Gamepad2 },
  { to: '/videos', label: 'Videodarslar', icon: Clapperboard },
  { to: '/profile', label: 'Mening profilim', icon: UserRound },
];
const teacherNav = [
  { to: '/teacher', label: 'Mening sinflarim', icon: GraduationCap },
  { to: '/teacher/assignments', label: 'Topshiriqlar', icon: ClipboardList },
  { to: '/profile', label: 'Mening profilim', icon: UserRound },
];
const adminNav = [
  { to: '/admin', label: 'Umumiy ko‘rinish', icon: House },
  { to: '/admin/content', label: 'O‘quv kontenti', icon: Layers },
  { to: '/admin/users', label: 'Foydalanuvchilar', icon: Users },
  { to: '/admin/classes', label: 'Sinflar', icon: GraduationCap },
  { to: '/admin/gamification', label: 'Gamifikatsiya', icon: Settings2 },
  { to: '/admin/avatars', label: 'Avatarlar katalogi', icon: UserRound },
  { to: '/admin/videos', label: 'Videodarslar', icon: Clapperboard },
  { to: '/profile', label: 'Mening profilim', icon: UserRound },
];
const adminTeacherNav = [...adminNav.slice(0, -1), ...teacherNav.slice(0, 2), adminNav.at(-1)!];
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
      ? `${user!.student?.grade}-sinf o‘quvchisi`
      : user!.role === 'TEACHER'
        ? 'O‘qituvchi'
        : user!.teacherAccess
          ? 'Administrator · O‘qituvchi'
          : 'Administrator';
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Asosiy tarkibga o‘tish
      </a>
      <aside className={`sidebar ${menu ? 'mobile-open' : ''}`}>
        <Link to={homeFor(user!)} className="brand" aria-label={`${brand.name} bosh sahifa`}>
          <Logo />
        </Link>
        <p className="brand-tagline">{brand.tagline}</p>
        <div className="nav-label">SIZNING MAYDONINGIZ</div>
        <nav aria-label="Asosiy navigatsiya">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard' || to === '/teacher' || to === '/admin'}
              onClick={() => setMenu(false)}
            >
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-note">
          <div className="note-star">
            <Sparkles size={21} />
          </div>
          <strong>Har bir qadam muhim.</strong>
          <p>Bugungi kichik harakat — ertangi katta natija.</p>
        </div>
        <Button variant="ghost" className="logout" onClick={() => void signOut()}>
          <LogOut size={18} />
          Chiqish
        </Button>
      </aside>
      <div className="main-shell">
        <div className="topbar">
          <div className="topbar-left">
            <Button
              variant="ghost"
              className="mobile-menu"
              aria-label="Menyuni ochish"
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              <Menu size={22} />
            </Button>
            <span className="platform-label">BILIM UCHUN YANGI MAYDON</span>
            <span className="live-dot" />
            <span className="desktop-only">{brand.name} platformasi</span>
          </div>
          <div className="topbar-actions">
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
          <span>Bilimingiz — eng katta imkoniyatingiz.</span>
        </footer>
      </div>
      <nav className="bottom-nav" aria-label="Mobil navigatsiya">
        {nav.slice(0, 4).map(({ to, label, icon: Icon }) => (
          <NavLink to={to} key={to} end={['/dashboard', '/teacher', '/admin'].includes(to)}>
            <Icon size={21} />
            <span>{label.split(' ').at(-1)}</span>
          </NavLink>
        ))}
        <button onClick={() => setMenu(!menu)} aria-label="Barcha sahifalar" aria-expanded={menu}>
          <Menu size={21} />
          <span>Menyu</span>
        </button>
      </nav>
    </div>
  );
}
