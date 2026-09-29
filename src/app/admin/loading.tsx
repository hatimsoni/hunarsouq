export default function Loading() {
  return (
    <div role="status" className="space-y-5 p-8">
      <span className="sr-only">Loading administration…</span>
      <div className="h-10 w-64 animate-pulse rounded bg-secondary" />
      <div className="h-64 animate-pulse rounded-xl bg-secondary" />
    </div>
  );
}
