import React, { useRef, useEffect, useState } from 'react';

const Canvas = ({ roomId, socket, isDrawer }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    
    // NEW: Toolbar States [cite: 607]
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(5);

    useEffect(() => {
        const canvas = canvasRef.current;
        canvas.width = 800;
        canvas.height = 500;
        
        const context = canvas.getContext("2d");
        context.lineCap = "round";
        contextRef.current = context;

        // NEW: Listening for draw data with styles 
        socket.on('receive_draw', (data) => {
            const { x, y, isStarting, color: incomingColor, lineWidth: incomingWidth } = data;
            
            // Apply the drawer's chosen style to our screen
            contextRef.current.strokeStyle = incomingColor;
            contextRef.current.lineWidth = incomingWidth;

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
        if (!isDrawer) return; 

        const { offsetX, offsetY } = nativeEvent;
        
        // Apply our current selected styles before drawing [cite: 616]
        contextRef.current.strokeStyle = color;
        contextRef.current.lineWidth = lineWidth;
        
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
        setIsDrawing(true);

        // NEW: Emit color and width to others [cite: 607]
        socket.emit('draw_data', { 
            roomId, x: offsetX, y: offsetY, isStarting: true, 
            color, lineWidth 
        });
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing || !isDrawer) return;

        const { offsetX, offsetY } = nativeEvent;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();

        // NEW: Emit color and width to others
        socket.emit('draw_data', { 
            roomId, x: offsetX, y: offsetY, isStarting: false, 
            color, lineWidth 
        });
    };

    const stopDrawing = () => {
        if (!isDrawer) return;
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const clearCanvas = () => {
        if (!isDrawer) return;
        contextRef.current.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        socket.emit('clear_canvas', roomId);
    };

    return (
        <div className="flex flex-col items-center gap-4 w-full bg-gray-100 rounded-lg p-4 shadow-inner">
            <canvas
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                ref={canvasRef}
                className={`bg-white border-4 border-gray-800 shadow-md ${isDrawer ? 'cursor-crosshair' : 'cursor-not-allowed'}`}
            />
            
            {/* NEW: TOOLBAR UI - Only visible to the drawer  */}
            {isDrawer && (
                <div className="flex flex-wrap items-center justify-center gap-6 bg-white p-4 rounded-xl border-2 border-gray-300 w-full max-w-[800px]">
                    
                    {/* Color Swatches [cite: 611] */}
                    <div className="flex gap-2 border-r pr-6">
                        {['#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#ffffff'].map((c) => (
                            <button 
                                key={c} 
                                onClick={() => setColor(c)}
                                style={{ backgroundColor: c }}
                                className={`w-8 h-8 rounded-full border-2 transition transform hover:scale-110 ${color === c ? 'border-blue-500 scale-125' : 'border-gray-300'}`}
                                title={c === '#ffffff' ? "Eraser" : "Color"}
                            />
                        ))}
                    </div>

                    {/* Brush Size Slider [cite: 612] */}
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Size</span>
                        <input 
                            type="range" min="1" max="30" 
                            value={lineWidth} 
                            onChange={(e) => setLineWidth(e.target.value)} 
                            className="w-32 cursor-pointer accent-blue-600"
                        />
                        <div 
                            className="bg-black rounded-full" 
                            style={{ width: `${lineWidth}px`, height: `${lineWidth}px` }} 
                        />
                    </div>

                    {/* Clear Button [cite: 613] */}
                    <button 
                        onClick={clearCanvas}
                        className="ml-auto bg-red-500 hover:bg-red-600 text-white font-black px-6 py-2 rounded-lg transition active:scale-95 shadow-md uppercase text-sm"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
};

export default Canvas;