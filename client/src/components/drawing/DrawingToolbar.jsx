import { DRAW_COLORS } from "../../utils/constants";
import Button from "../ui/Button";

export default function DrawingToolbar({ tool, setTool, onClear, onFill, canDraw }) {
  if (!canDraw) {
    return (
      <div className="shrink-0 rounded-2xl bg-slate-100 p-3 text-center text-sm text-slate-500">
        Waiting for your turn to draw.
      </div>
    );
  }

  return (
    <div className="shrink-0 space-y-3 rounded-2xl bg-slate-100 p-3 text-slate-900">
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Colors</p>
        <div className="grid grid-cols-11 gap-1.5 sm:grid-cols-11">
          {DRAW_COLORS.map(({ hex, label }) => (
            <button
              key={hex}
              type="button"
              title={label}
              onClick={() => setTool((prev) => ({ ...prev, color: hex, mode: "brush" }))}
              className={`aspect-square h-7 w-7 rounded-lg border-2 transition hover:scale-105 ${
                tool.color === hex && tool.mode === "brush"
                  ? "border-slate-900 ring-2 ring-sky-400 ring-offset-1"
                  : hex === "#ffffff"
                    ? "border-slate-300"
                    : "border-white"
              }`}
              style={{ backgroundColor: hex }}
              aria-label={label}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Size
          <input
            type="range"
            min="1"
            max="32"
            value={tool.size}
            onChange={(e) => setTool((prev) => ({ ...prev, size: Number(e.target.value) }))}
            className="w-28 accent-sky-600"
          />
          <span className="w-6 text-center tabular-nums">{tool.size}</span>
        </label>
        <Button
          className={`${tool.mode === "eraser" ? "bg-sky-700 text-white" : "bg-white text-slate-900"}`}
          onClick={() =>
            setTool((prev) => ({ ...prev, mode: prev.mode === "eraser" ? "brush" : "eraser" }))
          }
        >
          Eraser
        </Button>
        <Button className="bg-violet-600 text-white" onClick={onFill}>
          Fill
        </Button>
        <Button className="bg-rose-600 text-white" onClick={onClear}>
          Clear
        </Button>
      </div>
    </div>
  );
}
