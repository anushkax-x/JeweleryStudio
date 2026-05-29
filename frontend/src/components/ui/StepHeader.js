export default function StepHeader({ step, title, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-canvas font-mono text-[0.7rem] font-medium tracking-wide text-muted">
          {String(step).padStart(2, '0')}
        </span>
        <h2 className="font-display text-[1.35rem] font-medium tracking-tight text-ink">{title}</h2>
      </div>
      {children}
    </div>
  );
}
