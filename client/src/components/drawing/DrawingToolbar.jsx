import { DRAW_COLORS } from "../../utils/constants";
import Button from "../ui/Button";

export default function DrawingToolbar({ tool, setTool, onClear, onFill, canDraw }) {
  if (!canDraw) {
    return (
      <div className="rounded-2xl bg-slate-100 p-3 text-center text-sm text-slate-500">
        Waiting for your turn to draw.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-100 p-3 text-slate-900">
      <div className="flex flex-wrap gap-2">
        {DRAW_COLORS.map((color) => (
          <button
            key={color}
            onClick={() => setTool((prev) => ({ ...prev, color, mode: "brush" }))}
            className={`h-7 w-7 rounded-full border-2 transition ${
              tool.color === color && tool.mode === "brush" ? "border-slate-900 scale-110" : "border-white"
            }`}
            style={{ backgroundColor: color }}
            aria-label={`Color ${color}`}
          />
        ))}
      </div>
      <input
        type="range"
        min="1"
        max="24"
        value={tool.size}
        onChange={(e) => setTool((prev) => ({ ...prev, size: Number(e.target.value) }))}
        className="w-28 accent-sky-600"
      />
      <Button
        className={`${tool.mode === "eraser" ? "bg-sky-700 text-white" : "bg-white text-slate-900"}`}
        onClick={() => setTool((prev) => ({ ...prev, mode: prev.mode === "eraser" ? "brush" : "eraser" }))}
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
  );
}
