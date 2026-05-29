export default function StepHeader({ step, title, children, compact }) {
  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 ${compact ? 'mb-3' : 'mb-5 gap-4'}`}>
      <div className="flex items-center gap-2.5">
        <span
          className={`flex shrink-0 items-center justify-center rounded-full border border-line bg-canvas font-mono font-medium tracking-wide text-muted ${
            compact ? 'h-7 w-7 text-[0.65rem]' : 'h-8 w-8 text-[0.7rem]'
          }`}
        >
          {String(step).padStart(2, '0')}
        </span>
        <h2
          className={`font-display font-medium tracking-tight text-ink ${
            compact ? 'text-[1.1rem]' : 'text-[1.35rem]'
          }`}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
