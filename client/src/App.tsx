import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import LoginPage from '@/features/auth/LoginPage';
import VerifyPage from '@/features/auth/VerifyPage';
import HomePage from '@/features/home/HomePage';
import ProfilePage from '@/features/profile/ProfilePage';
import PodsPage from '@/features/pods/PodsPage';
import PodDetailPage from '@/features/pods/PodDetailPage';
import SessionsPage from '@/features/sessions/SessionsPage';
import SessionDetailPage from '@/features/sessions/SessionDetailPage';
import CreateSessionPage from '@/features/sessions/CreateSessionPage';
import InvitesPage from '@/features/invites/InvitesPage';
import InviteAcceptPage from '@/features/invites/InviteAcceptPage';
import LiveSessionPage from '@/features/live/LiveSessionPage';
import HostDashboardPage from '@/features/host/HostDashboardPage';
import NotFoundPage from '@/features/misc/NotFoundPage';
import { useAuthStore } from '@/stores/authStore';

export default function App() {
  const checkSession = useAuthStore((s) => s.checkSession);

  useEffect(() => {
    checkSession();
  }, [checkSession]);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/invite/:code" element={<InviteAcceptPage />} />

      {/* Protected routes inside layout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/pods" element={<PodsPage />} />
        <Route path="/pods/:podId" element={<PodDetailPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/sessions/new" element={<CreateSessionPage />} />
        <Route path="/sessions/:sessionId" element={<SessionDetailPage />} />
        <Route path="/invites" element={<InvitesPage />} />
        <Route path="/session/:sessionId/live" element={<LiveSessionPage />} />
        <Route path="/session/:sessionId/host" element={<HostDashboardPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
