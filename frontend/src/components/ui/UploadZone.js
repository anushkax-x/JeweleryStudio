export default function UploadZone({ label, hint, preview, emptyLabel, onChange, optional }) {
  return (
    <label className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-line-strong bg-canvas/80 px-5 py-8 transition-colors hover:border-accent hover:bg-accent-muted/30">
      <input type="file" accept="image/*" onChange={onChange} className="sr-only" />
      {preview ? (
        <img src={preview} alt="" className="mb-3 h-16 w-16 rounded-lg object-cover shadow-sm ring-1 ring-line" />
      ) : (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-subtle ring-1 ring-line">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </div>
      )}
      <span className="text-[0.9rem] font-medium text-ink">{label}</span>
      {hint && <span className="mt-1 text-center text-[0.75rem] text-muted max-w-[240px]">{hint}</span>}
      <span className="mt-2 text-[0.7rem] text-subtle">
        {preview ? 'Click to replace' : emptyLabel || 'PNG, JPG'}
        {optional ? ' · optional' : ''}
      </span>
    </label>
  );
}
