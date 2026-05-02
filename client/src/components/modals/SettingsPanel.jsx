export default function SettingsPanel({ isOpen, settings, onChange }) {
  if (!isOpen) return null;

  return (
    <aside className="absolute right-0 top-12 z-40 w-72 rounded-2xl bg-blue-800 p-4 shadow-2xl">
      <h3 className="mb-3 text-lg font-bold">Settings</h3>
      <div className="space-y-3">
        <label className="flex items-center justify-between text-sm">
          <span>Sound</span>
          <input
            type="checkbox"
            checked={settings.sound}
            onChange={(e) => onChange((prev) => ({ ...prev, sound: e.target.checked }))}
          />
        </label>
        <label className="flex items-center justify-between text-sm">
          <span>Music</span>
          <input
            type="checkbox"
            checked={settings.music}
            onChange={(e) => onChange((prev) => ({ ...prev, music: e.target.checked }))}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span>Volume: {settings.volume}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.volume}
            onChange={(e) => onChange((prev) => ({ ...prev, volume: Number(e.target.value) }))}
            className="accent-sky-400"
          />
        </label>
      </div>
    </aside>
  );
}
