///Guessing & messages
import React, { useState, useEffect, useRef } from 'react';

const Chat = ({ socket, roomId, playerName }) => {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const chatEndRef = useRef(null);

    useEffect(() => {
        socket.on('receive_message', (data) => {
            setMessages((prev) => [...prev, data]);
        });
        return () => socket.off('receive_message');
    }, [socket]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('send_message', { roomId, message, name: playerName });
            setMessage('');
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-2 border-gray-300 rounded shadow-sm">
            <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[400px]">
                {messages.map((msg, index) => (
                    <div key={index} className={`p-2 rounded ${msg.isCorrect ? 'bg-green-100 text-green-800 font-bold' : 'bg-gray-100'}`}>
                        <span className="font-bold text-blue-600">{msg.name}: </span>
                        {msg.message}
                    </div>
                ))}
                <div ref={chatEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-2 border-t flex gap-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type your guess here..."
                    className="flex-1 p-2 border rounded outline-none focus:border-blue-500"
                />
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded font-bold hover:bg-blue-600">Send</button>
            </form>
        </div>
    );
};

export default Chat;