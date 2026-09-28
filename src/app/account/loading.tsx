export default function Loading() {
  return (
    <div
      role="status"
      className="mx-auto max-w-4xl animate-pulse space-y-5 p-6"
    >
      <span className="sr-only">Loading your account…</span>
      <div className="h-10 w-56 rounded bg-secondary" />
      <div className="h-72 rounded-2xl bg-secondary" />
    </div>
  );
}
