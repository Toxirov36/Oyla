import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
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
} from 'lucide-react';
import { homeFor, useAuth } from '../lib/auth';
import { Button } from './ui';

const studentNav = [
  { to: '/dashboard', label: 'Bosh sahifa', icon: House },
  { to: '/subjects', label: 'Mening fanlarim', icon: BookOpen },
  { to: '/challenge', label: 'Kunlik challenge', icon: Zap },
  { to: '/progress', label: 'Mening progressim', icon: ChartNoAxesCombined },
  { to: '/leaderboard', label: 'Reyting', icon: Trophy },
  { to: '/badges', label: 'Nishonlar', icon: Award },
  { to: '/assignments', label: 'Topshiriqlar', icon: ClipboardList },
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
  { to: '/profile', label: 'Mening profilim', icon: UserRound },
];
const adminTeacherNav = [...adminNav.slice(0, -1), ...teacherNav.slice(0, 2), adminNav.at(-1)!];
export function Logo() {
  return (
    <span className="logo">
      <span className="logo-symbol">
        <Sparkles size={23} />
      </span>
      oyla<span className="logo-dot">.</span>
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
        <Link to={homeFor(user!)} className="brand" aria-label="OYLA bosh sahifa">
          <Logo />
        </Link>
        <p className="brand-tagline">O‘rgan. O‘yla. Yarat.</p>
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
            <span className="desktop-only">OYLA platformasi</span>
          </div>
          <Link to="/profile" className="profile-chip" aria-label="Profilimni ochish">
            <span className="avatar">{user!.name.slice(0, 1)}</span>
            <div>
              <strong>{user!.name}</strong>
              <small>{roleLabel}</small>
            </div>
            <ChevronDown size={16} />
          </Link>
        </div>
        <main id="main" className="page-content">
          <Outlet />
        </main>
        <footer className="page-footer">
          <span>© {new Date().getFullYear()} OYLA</span>
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
