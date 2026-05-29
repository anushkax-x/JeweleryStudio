export default function Card({ children, className = '', as: Tag = 'section' }) {
  return (
    <Tag className={`rounded-2xl border border-line bg-surface p-6 shadow-card ${className}`}>
      {children}
    </Tag>
  );
}
