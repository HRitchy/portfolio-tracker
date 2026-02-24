export default function LoadingSpinner({ text = 'Chargement...' }: { text?: string }) {
  return (
    <div className="flex items-center justify-center h-[200px] text-[var(--muted)]">
      <div className="spinner mr-3" />
      {text}
    </div>
  );
}
