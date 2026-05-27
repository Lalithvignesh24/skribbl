import { useCanvas } from "../../hooks/useCanvas";
import DrawingToolbar from "./DrawingToolbar";

export default function DrawingBoard({ socket, roomId, canDraw }) {
  const { canvasRef, tool, setTool, startDraw, draw, stopDraw, clearCanvas, fillCanvas } = useCanvas({
    socket,
    roomId,
    canDraw,
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
          onTouchCancel={stopDraw}
          className={`touch-none h-full min-h-[clamp(380px,52vh,680px)] w-full rounded-2xl border-4 border-slate-900 bg-white shadow-inner ${
            canDraw ? "cursor-crosshair" : "cursor-not-allowed"
          }`}
        />
      </div>
      <DrawingToolbar
        tool={tool}
        setTool={setTool}
        onClear={clearCanvas}
        onFill={fillCanvas}
        canDraw={canDraw}
      />
    </div>
  );
}
