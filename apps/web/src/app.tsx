import { lazy, Suspense, useEffect } from 'react';
import { useI18n } from './i18n';
import { applyBrand } from './lib/brand';
import { Navigate, Route, Routes, Outlet, useLocation } from 'react-router-dom';
import { homeFor, useAuth } from './lib/auth';
import type { Role } from './lib/types';
import { AppShell } from './components/shell';
import { EmptyState, Loading } from './components/ui';
const AuthPage = lazy(() => import('./pages/auth'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const Subjects = lazy(() => import('./pages/subjects'));
const Lesson = lazy(() => import('./pages/lesson'));
const StudentData = lazy(() => import('./pages/student-data'));
const Teacher = lazy(() => import('./pages/teacher'));
const ExerciseCatalog = lazy(() => import('./pages/admin/exercise-catalog'));
const Admin = lazy(() => import('./pages/admin'));
const AdminAvatars = lazy(() => import('./pages/admin/avatars'));
const Games = lazy(() => import('./pages/games'));
const BrainRing = lazy(() => import('./pages/brain-ring'));
const Videos = lazy(() => import('./pages/videos'));
const AdminVideos = lazy(() => import('./pages/admin/videos'));
const AdminMemory = lazy(() => import('./pages/admin/memory'));
const Profile = lazy(() => import('./pages/profile'));
const Friends = lazy(() => import('./pages/friends'));
const StudentClass = lazy(() => import('./pages/student-class'));
const Notifications = lazy(() => import('./pages/notifications'));
const PasswordRecovery = lazy(() => import('./pages/password-recovery'));
function Protected({ role }: { role?: Role }) {
  const location = useLocation();
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user)
    return (
      <Navigate
        to="/login"
        replace
        state={
          location.pathname === '/friends' && new URLSearchParams(location.search).has('code')
            ? { returnTo: location.pathname + location.search }
            : null
        }
      />
    );
  const teacherAccess = role === 'TEACHER' && user.teacherAccess === true;
  if (role && user.role !== role && !teacherAccess) return <Navigate to={homeFor(user)} replace />;
  return <Outlet />;
}
function Home() {
  const { user, loading } = useAuth();
  return loading ? <Loading /> : <Navigate to={user ? homeFor(user) : '/login'} replace />;
}
export default function App() {
  const { t, locale } = useI18n();
  useEffect(() => {
    applyBrand({ tagline: t('brand.tagline'), description: t('brand.description') });
  }, [t, locale]);
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage register />} />
        <Route path="/forgot-password" element={<PasswordRecovery />} />
        <Route path="/reset-password" element={<PasswordRecovery reset />} />
        <Route element={<Protected />}>
          <Route element={<AppShell />}>
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route element={<Protected role="STUDENT" />}>
              <Route path="/games" element={<Games />} />
              <Route path="/games/:game" element={<Games />} />
              <Route path="/brain-ring" element={<BrainRing />} />
              <Route path="/brain-ring/:id" element={<BrainRing />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/videos/:id" element={<Videos />} />
              <Route path="/my-class" element={<StudentClass />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/subjects/:id" element={<Subjects />} />
              <Route path="/lessons/:id" element={<Lesson />} />
              <Route path="/challenge" element={<Lesson daily />} />
              {(['progress', 'badges', 'leaderboard', 'assignments'] as const).map((mode) => (
                <Route key={mode} path={`/${mode}`} element={<StudentData mode={mode} />} />
              ))}
            </Route>
            <Route element={<Protected role="TEACHER" />}>
              <Route path="/teacher" element={<Teacher />} />
              <Route path="/teacher/classes/:id" element={<Teacher />} />
              <Route path="/teacher/assignments" element={<Teacher assignmentsOnly />} />
            </Route>
            <Route element={<Protected role="ADMIN" />}>
              <Route path="/admin/videos" element={<AdminVideos />} />
              <Route path="/admin/memory" element={<AdminMemory />} />
              <Route path="/admin/avatars" element={<AdminAvatars />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/admin/exercises" element={<ExerciseCatalog />} />
              {(['users', 'content', 'gamification', 'classes'] as const).map((mode) => (
                <Route key={mode} path={`/admin/${mode}`} element={<Admin mode={mode} />} />
              ))}
            </Route>
          </Route>
        </Route>
        <Route
          path="*"
          element={
            <EmptyState
              title={t('app.notFound')}
              action={
                <a className="btn btn-primary" href="/">
                  {t('app.backHome')}
                </a>
              }
            />
          }
        />
      </Routes>
    </Suspense>
  );
}
