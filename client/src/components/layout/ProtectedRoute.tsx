import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { PageLoader } from '@/components/ui/Spinner';
import { type ReactNode } from 'react';

export default function ProtectedRoute({ children }: { children?: ReactNode }) {
  const { user, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) return <div className="h-screen w-screen bg-white flex items-center justify-center"><PageLoader /></div>;
  if (!user) return <Navigate to="/welcome" state={{ from: location }} replace />;

  // Gate onboarding to first login — don't interrupt live sessions or the onboarding page itself.
  // We require BOTH onboarding_completed AND profile_complete to be true. A user with
  // onboarding_completed=true but profile_complete=false (e.g. existing users predating
  // the mandatory-profile change) is redirected back through onboarding until the four
  // required profile fields are filled (see /auth/onboarding/complete).
  const isOnboarding = location.pathname === '/onboarding';
  const isLiveSession = location.pathname.startsWith('/sessions/') && location.pathname.includes('/live');
  const onboardingCompleted = (user as any).onboardingCompleted === true;
  const profileComplete = (user as any).profileComplete === true;
  if ((!onboardingCompleted || !profileComplete) && !isOnboarding && !isLiveSession) {
    const safeRedirect = location.pathname.startsWith('/onboarding') ? '/' : location.pathname;
    return <Navigate to={`/onboarding?redirect=${encodeURIComponent(safeRedirect)}`} replace />;
  }

  return <>{children}</>;
}
