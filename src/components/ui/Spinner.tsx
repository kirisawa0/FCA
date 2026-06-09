export function Spinner({ className = '' }: { className?: string }) {
  return (
    <div
      className={`h-8 w-8 animate-spin rounded-full border-4 border-fca-border border-t-brand-400 ${className}`}
      role="status"
      aria-label="Chargement"
    />
  );
}
