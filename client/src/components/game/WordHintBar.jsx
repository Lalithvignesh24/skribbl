export default function WordHintBar({ hint, drawerWord, isDrawer, drawerName }) {
  const display = isDrawer
    ? (drawerWord || "…").toUpperCase()
    : hint || "________";

  return (
    <div className="mb-3 shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-center text-slate-900 shadow-lg">
      <p className="text-xs uppercase text-slate-500">
        Drawer: {drawerName || "Waiting..."}
        {isDrawer && drawerWord ? (
          <span className="ml-2 font-bold text-emerald-600">— your word</span>
        ) : null}
      </p>
      <p className="font-mono text-2xl font-bold tracking-[0.35em]">{display}</p>
    </div>
  );
}
