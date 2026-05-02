export default function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-blue-800/80 shadow-2xl backdrop-blur ${className}`}>{children}</div>;
}
