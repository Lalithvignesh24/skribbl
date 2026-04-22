import React, { useRef, useEffect, useState } from 'react';

// Added 'isDrawer' prop to control permissions
const Canvas = ({ roomId, socket, isDrawer }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 800;
        canvas.height = 500;
        
        const context = canvas.getContext("2d");
        context.lineCap = "round";
        context.strokeStyle = "black";
        context.lineWidth = 5;
        contextRef.current = context;

        socket.on('receive_draw', (data) => {
            const { x, y, isStarting } = data;
            if (isStarting) {
                contextRef.current.beginPath();
                contextRef.current.moveTo(x, y);
            } else {
                contextRef.current.lineTo(x, y);
                contextRef.current.stroke();
            }
        });

        socket.on('clear_canvas', () => {
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        });

        return () => {
            socket.off('receive_draw');
            socket.off('clear_canvas');
        };
    }, [socket]);

    const startDrawing = ({ nativeEvent }) => {
        // PERMISSION CHECK: Block if not the drawer
        if (!isDrawer) return; 

        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);
        socket.emit('draw_data', { roomId, x: offsetX, y: offsetY, isStarting: true });
    };

    const draw = ({ nativeEvent }) => {
        // PERMISSION CHECK: Block if not the drawer or not clicking
        if (!isDrawing || !isDrawer) return;

        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
        socket.emit('draw_data', { roomId, x: offsetX, y: offsetY, isStarting: false });
    };

    const stopDrawing = () => {
        if (!isDrawer) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        // PERMISSION CHECK: Block if not the drawer
        if (!isDrawer) return;
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit('clear_canvas', roomId);
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            <canvas
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                ref={canvasRef}
                // Visual feedback: change cursor if user cannot draw
                className={`bg-white border-4 border-gray-800 shadow-inner ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            />
            {/* Only show Clear button to the drawer */}
            {isDrawer && (
                <button 
                    onClick={clearCanvas}
                    className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg transition shadow-md"
                >
                    Clear Canvas
                </button>
            )}
        </div>
    );
};

export default Canvas;