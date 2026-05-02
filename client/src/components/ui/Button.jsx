export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-2xl px-4 py-2 font-semibold transition hover:scale-[1.02] active:scale-[0.98] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
