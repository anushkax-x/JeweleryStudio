export default function Card({ children, className = '', as: Tag = 'section' }) {
  return (
    <Tag
      className={`rounded-2xl border border-line/80 bg-surface shadow-card ${className}`}
    >
      {children}
    </Tag>
  );
}
