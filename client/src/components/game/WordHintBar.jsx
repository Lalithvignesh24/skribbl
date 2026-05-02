export default function WordHintBar({ hint, drawerName }) {
  return (
    <div className="mb-3 rounded-2xl bg-slate-100 px-4 py-2 text-center text-slate-900 shadow-lg">
      <p className="text-xs uppercase text-slate-500">Drawer: {drawerName || "Waiting..."}</p>
      <p className="font-mono text-2xl font-bold tracking-[0.35em]">{hint}</p>
    </div>
  );
}
