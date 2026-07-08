export function PageHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-2">
      <h1 className="font-display text-3xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}
