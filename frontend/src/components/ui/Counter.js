export default function Counter({ label, value, onChange, min = 0, compact }) {
  return (
    <div className={compact ? '' : ''}>
      <p
        className={`font-medium uppercase tracking-[0.1em] text-subtle ${
          compact ? 'mb-1.5 text-[0.62rem]' : 'mb-2 text-[0.65rem]'
        }`}
      >
        {label}
      </p>
      <div className="inline-flex items-center rounded-lg border border-line bg-surface shadow-sm">
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="min-w-[2rem] text-center text-[0.9rem] font-medium tabular-nums text-ink">
          {value}
        </span>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center text-muted transition-colors hover:text-ink"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
