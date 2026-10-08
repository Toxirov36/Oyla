import { lazy, Suspense } from 'react';
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
              title="Sahifa topilmadi"
              action={
                <a className="btn btn-primary" href="/">
                  Bosh sahifaga qaytish
                </a>
              }
            />
          }
        />
      </Routes>
    </Suspense>
  );
}
