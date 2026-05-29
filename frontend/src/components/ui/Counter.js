export default function Counter({ label, value, onChange, min = 0 }) {
  return (
    <div>
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.12em] text-subtle mb-2">{label}</p>
      <div className="inline-flex items-center rounded-xl border border-line bg-canvas">
        <button
          type="button"
          className="h-10 w-10 text-muted hover:text-ink transition-colors text-lg"
          onClick={() => onChange(Math.max(min, value - 1))}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <input
          type="number"
          className="w-12 bg-transparent text-center text-[0.95rem] font-medium text-ink focus:outline-none"
          value={value}
          min={min}
          onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
        />
        <button
          type="button"
          className="h-10 w-10 text-muted hover:text-ink transition-colors text-lg"
          onClick={() => onChange(value + 1)}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
