import React, { useRef, useEffect, useState } from 'react';

// Notice we now take 'socket' as a prop [cite: 284]
const Canvas = ({ roomId, socket }) => {
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

        // Listen for drawing data from other players [cite: 58, 84]
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

        // Listen for the clear signal [cite: 53]
        socket.on('clear_canvas', () => {
            contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
        });

        return () => {
            socket.off('receive_draw');
            socket.off('clear_canvas');
        };
    }, [socket]); // Re-run if socket changes

    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);

        // Send the starting point to the server [cite: 56]
        socket.emit('draw_data', { roomId, x: offsetX, y: offsetY, isStarting: true });
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();

        // Send movement data [cite: 56, 57]
        socket.emit('draw_data', { roomId, x: offsetX, y: offsetY, isStarting: false });
    };

    const stopDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
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
                className="bg-white border-4 border-gray-800 cursor-crosshair max-w-full h-auto shadow-inner"
            />
            <button 
                onClick={clearCanvas}
                className="bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-2 rounded-lg transition shadow-md"
            >
                Clear Canvas
            </button>
        </div>
    );
};

export default Canvas;