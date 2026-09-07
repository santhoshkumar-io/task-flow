interface PlaceholderPageProps {
  title: string;
  arrivesIn: string;
}

// An honest empty screen. It says what is not built yet rather than showing an
// invented table, because AGENTS.md forbids putting anything on screen that did
// not come from an API response.
export function PlaceholderPage({ title, arrivesIn }: PlaceholderPageProps) {
  return (
    <div>
      <h1 className="font-heading text-2xl font-bold tracking-[-0.02em] text-ink">
        {title}
      </h1>
      <p className="mt-2 text-sm text-muted">
        This screen is not built yet. It arrives in {arrivesIn}.
      </p>
    </div>
  );
}
