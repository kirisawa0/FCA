import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { resetPageUiState } from '@/contexts/ConfirmContext';
import type { UserRole } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

function LogoutButton() {
  const { signOut } = useAuth();
  return (
    <button
      type="button"
      className="btn-secondary"
      onClick={async () => {
        resetPageUiState();
        await signOut();
      }}
    >
      Se déconnecter
    </button>
  );
}

interface Props {
  children: ReactNode;
  role?: UserRole;
}

export function ProtectedRoute({ children, role }: Props) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-bg flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (!profile) {
    return (
      <div className="app-bg flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="max-w-md text-sm text-zinc-400">
          Votre session est active mais votre profil n&apos;a pas pu être chargé.
          Déconnectez-vous et reconnectez-vous, ou contactez l&apos;administrateur du club.
        </p>
        <LogoutButton />
      </div>
    );
  }

  if (role && profile.role !== role) {
    // Redirige chaque utilisateur vers son tableau de bord
    const home = profile.role === 'coach' ? '/coach' : '/joueur';
    return <Navigate to={home} replace />;
  }

  return <>{children}</>;
}
