export default function GameShell({ left, center, right }) {
  return (
    <div className="grid h-[calc(100vh-130px)] grid-cols-1 gap-3 lg:grid-cols-12">
      <aside className="rounded-2xl bg-blue-800/80 p-3 shadow-xl lg:col-span-3">{left}</aside>
      <main className="rounded-2xl bg-blue-800/80 p-3 shadow-xl lg:col-span-6">{center}</main>
      <aside className="rounded-2xl bg-blue-800/80 p-3 shadow-xl lg:col-span-3">{right}</aside>
    </div>
  );
}
