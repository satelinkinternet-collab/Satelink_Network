"use client";

type Metric = { label: string; value: string; detail?: string };

export function OsPageTemplate({
  title,
  subtitle,
  metrics,
  children,
}: {
  title: string;
  subtitle: string;
  metrics: Metric[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-white md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-[#B0E4CC]/72">{subtitle}</p>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs text-[#B0E4CC]/65">{metric.label}</p>
            <p className="mt-2 text-xl font-semibold text-white">{metric.value}</p>
            {metric.detail ? <p className="mt-1 text-xs text-[#408A71]">{metric.detail}</p> : null}
          </article>
        ))}
      </div>
      {children}
    </div>
  );
}
