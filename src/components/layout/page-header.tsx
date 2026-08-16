export function PageHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
      {description ? (
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
