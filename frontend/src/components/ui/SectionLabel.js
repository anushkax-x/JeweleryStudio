export default function SectionLabel({ children, hint }) {
  return (
    <div className="mb-3">
      <p className="text-[0.7rem] font-medium uppercase tracking-[0.14em] text-subtle">{children}</p>
      {hint && <p className="mt-1 text-[0.8rem] leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}
