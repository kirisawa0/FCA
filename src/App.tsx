import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ConfirmProvider } from '@/contexts/ConfirmContext';
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

export default function App() {
  return (
    <AuthProvider>
      <ConfirmProvider>
        <HashRouter>
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

          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </HashRouter>
      </ConfirmProvider>
    </AuthProvider>
  );
}
