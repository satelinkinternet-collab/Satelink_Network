export default function LoadingOverview() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-72 animate-pulse rounded bg-white/10" />
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="h-24 animate-pulse rounded-xl bg-white/10" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}
