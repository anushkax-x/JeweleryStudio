export default function UploadZone({ label, hint, preview, emptyLabel, onChange, optional, compact }) {
  if (compact) {
    return (
      <label className="group flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-line bg-canvas/50 px-3 py-2.5 transition-colors hover:border-accent/40 hover:bg-accent-muted/15">
        <input type="file" accept="image/*" onChange={onChange} className="sr-only" />
        {preview ? (
          <img src={preview} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-line" />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface text-subtle ring-1 ring-line group-hover:text-accent">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <span className="block text-[0.8rem] font-medium text-ink">{label}</span>
          <span className="block truncate text-[0.68rem] text-subtle">
            {preview ? 'Replace' : hint || (optional ? 'Optional' : 'Upload')}
          </span>
        </div>
      </label>
    );
  }

  return (
    <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line bg-canvas/50 px-4 py-6 transition-all duration-200 hover:border-accent/50 hover:bg-accent-muted/20">
      <input type="file" accept="image/*" onChange={onChange} className="sr-only" />
      {preview ? (
        <img
          src={preview}
          alt=""
          className="mb-3 h-14 w-14 rounded-lg object-cover ring-1 ring-line shadow-sm"
        />
      ) : (
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface text-subtle ring-1 ring-line transition-colors group-hover:text-accent">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <span className="text-[0.85rem] font-medium text-ink">{label}</span>
      {hint && (
        <span className="mt-0.5 max-w-[220px] text-center text-[0.72rem] leading-snug text-muted">{hint}</span>
      )}
      <span className="mt-2 text-[0.65rem] uppercase tracking-wider text-subtle">
        {preview ? 'Replace' : emptyLabel || 'JPG · PNG'}
        {optional ? ' · optional' : ''}
      </span>
    </label>
  );
}
