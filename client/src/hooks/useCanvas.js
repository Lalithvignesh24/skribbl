import { useCallback, useEffect, useRef, useState } from "react";

export function useCanvas({ socket, roomId, canDraw }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });
  const [tool, setTool] = useState({
    color: "#000000",
    size: 5,
    mode: "brush",
  });
  const [isDrawing, setIsDrawing] = useState(false);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.max(1, Math.floor(rect.width));
    const cssHeight = Math.max(1, Math.floor(rect.height));
    const dpr = window.devicePixelRatio || 1;

    const previousBitmap = document.createElement("canvas");
    previousBitmap.width = canvas.width;
    previousBitmap.height = canvas.height;
    if (canvas.width > 0 && canvas.height > 0) {
      const previousCtx = previousBitmap.getContext("2d");
      previousCtx.drawImage(canvas, 0, 0);
    }

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    const ctx = canvas.getContext("2d");
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    canvasSizeRef.current = { width: cssWidth, height: cssHeight };

    if (previousBitmap.width > 0 && previousBitmap.height > 0) {
      ctx.drawImage(
        previousBitmap,
        0,
        0,
        previousBitmap.width,
        previousBitmap.height,
        0,
        0,
        cssWidth,
        cssHeight,
      );
    } else {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    }

    ctxRef.current = ctx;
  }, []);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  useEffect(() => {
    if (!socket) return;

    const onReceiveDraw = ({ x, y, isStart, color, size }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = size;
      if (isStart) {
        ctx.beginPath();
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    };

    const onClear = () => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);
    };

    const onFill = ({ color }) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);
    };

    socket.on("receive_draw", onReceiveDraw);
    socket.on("clear_canvas", onClear);
    socket.on("fill_canvas", onFill);
    return () => {
      socket.off("receive_draw", onReceiveDraw);
      socket.off("clear_canvas", onClear);
      socket.off("fill_canvas", onFill);
    };
  }, [socket]);

  const getCanvasCoordinates = useCallback((event) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const hasTouches = "touches" in event;
    const touchPoint =
      hasTouches && event.touches?.length
        ? event.touches[0]
        : "changedTouches" in event && event.changedTouches?.length
          ? event.changedTouches[0]
          : null;

    const clientX = touchPoint ? touchPoint.clientX : event.clientX;
    const clientY = touchPoint ? touchPoint.clientY : event.clientY;

    const scaleX = canvasSizeRef.current.width / rect.width;
    const scaleY = canvasSizeRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const startDraw = useCallback((event) => {
    if (!canDraw || !ctxRef.current) return;
    if (event.cancelable) event.preventDefault();

    const { x, y } = getCanvasCoordinates(event);
    const drawColor = tool.mode === "eraser" ? "#ffffff" : tool.color;

    ctxRef.current.strokeStyle = drawColor;
    ctxRef.current.lineWidth = tool.size;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);

    setIsDrawing(true);

    socket?.emit("draw_data", {
      roomId,
      x,
      y,
      isStart: true,
      color: drawColor,
      size: tool.size,
    });
  }, [canDraw, getCanvasCoordinates, roomId, socket, tool]);


  const draw = useCallback((event) => {
    if (!canDraw || !isDrawing || !ctxRef.current) return;
    if (event.cancelable) event.preventDefault();

    const { x, y } = getCanvasCoordinates(event);

    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();

    socket?.emit("draw_data", {
      roomId,
      x,
      y,
      isStart: false,
      color: tool.mode === "eraser" ? "#ffffff" : tool.color,
      size: tool.size,
    });
  }, [canDraw, getCanvasCoordinates, isDrawing, roomId, socket, tool]);

  const stopDraw = useCallback(() => {
    if (!canDraw || !ctxRef.current) return;
    ctxRef.current.closePath();
    setIsDrawing(false);
  }, [canDraw]);

  const clearCanvas = useCallback(() => {
    if (!canDraw || !ctxRef.current || !canvasRef.current) return;
    ctxRef.current.fillStyle = "#ffffff";
    ctxRef.current.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);
    socket?.emit("clear_canvas", roomId);
  }, [canDraw, roomId, socket]);

  const fillCanvas = useCallback(() => {
    if (!canDraw || !ctxRef.current || !canvasRef.current) return;
    ctxRef.current.fillStyle = tool.color;
    ctxRef.current.fillRect(0, 0, canvasSizeRef.current.width, canvasSizeRef.current.height);
    socket?.emit("fill_canvas", { roomId, color: tool.color });
  }, [canDraw, roomId, socket, tool.color]);

  return {
    canvasRef,
    tool,
    setTool,
    startDraw,
    draw,
    stopDraw,
    clearCanvas,
    fillCanvas,
  };
}
