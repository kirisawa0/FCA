import { HashRouter, MemoryRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
import { isSupabaseConfigured } from '@/lib/supabase';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Layout } from '@/components/Layout';
import { Login } from '@/pages/Login';
import { Signup } from '@/pages/Signup';
import { CoachDashboard } from '@/pages/CoachDashboard';
import { CoachTeam } from '@/pages/CoachTeam';
import { CoachProfile } from '@/pages/CoachProfile';
import { PlayersManagement } from '@/pages/PlayersManagement';
import { PlayerProfile } from '@/pages/PlayerProfile';
import { PlayerDashboard } from '@/pages/PlayerDashboard';
import { CoachStatsTracking, PlayerStatsTracking } from '@/pages/StatsTracking';
import { JoueurProfil } from '@/pages/JoueurProfil';
import { Spinner } from '@/components/ui/Spinner';

function RootRedirect() {
  const { session, profile, loading } = useAuth();
  if (loading) {
    return (
      <div className="app-bg flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (!session || !profile) return <Navigate to="/login" replace />;
  return <Navigate to={profile.role === 'coach' ? '/coach' : '/joueur'} replace />;
}

function ConfigError() {
  return (
    <div className="app-bg flex min-h-dvh items-center justify-center p-6">
      <div className="card card-top-accent max-w-md p-8 text-center">
        <h1 className="text-lg font-bold text-white">Configuration manquante</h1>
        <p className="mt-3 text-sm text-zinc-400">
          L&apos;application n&apos;a pas été compilée avec les identifiants Supabase.
          Recompilez avec <code className="text-brand-300">VITE_SUPABASE_URL</code> et{' '}
          <code className="text-brand-300">VITE_SUPABASE_ANON_KEY</code>.
        </p>
      </div>
    </div>
  );
}

const isDesktopFile = typeof window !== 'undefined' && window.location.protocol === 'file:';

function AppRoutes() {
  return (
    <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          {/* Espace Coach */}
          <Route
            path="/coach"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <CoachDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/equipe"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <CoachTeam />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/profil"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <CoachProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/joueurs"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <PlayersManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/joueurs/:id"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <PlayerProfile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/coach/statistiques"
            element={
              <ProtectedRoute role="coach">
                <Layout>
                  <CoachStatsTracking />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Espace Joueur */}
          <Route
            path="/joueur"
            element={
              <ProtectedRoute role="joueur">
                <Layout>
                  <PlayerDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/joueur/statistiques"
            element={
              <ProtectedRoute role="joueur">
                <Layout>
                  <PlayerStatsTracking />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/joueur/profil"
            element={
              <ProtectedRoute role="joueur">
                <Layout>
                  <JoueurProfil />
                </Layout>
              </ProtectedRoute>
            }
          />

      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  if (!isSupabaseConfigured) {
    return <ConfigError />;
  }

  const Router = isDesktopFile ? MemoryRouter : HashRouter;

  return (
    <AuthProvider>
      <ConfirmProvider>
        <Router>
          <AppRoutes />
        </Router>
      </ConfirmProvider>
    </AuthProvider>
  );
}
