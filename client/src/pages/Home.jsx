import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const [name, setName] = useState('');
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const createRoom = () => {
        // Generate a random 6-character room ID
        const newRoomId = Math.random().toString(36).substring(2, 8);
        // Navigate to the game room with the name and ID as state
        navigate(`/game/${newRoomId}`, { state: { name } });
    };

    const joinRoom = () => {
        if (roomId) {
            navigate(`/game/${roomId}`, { state: { name } });
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-700 p-4">
            <h1 className="text-6xl font-black text-white mb-8 tracking-widest shadow-lg">skribbl.io clone</h1>
            
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <input
                    type="text"
                    placeholder="Enter your name"
                    className="w-full p-3 border-2 border-gray-300 rounded mb-4 focus:border-blue-500 outline-none"
                    onChange={(e) => setName(e.target.value)}
                />
                
                <button 
                    onClick={createRoom}
                    className="w-full bg-green-500 text-white font-bold py-3 rounded mb-4 hover:bg-green-600 transition"
                >
                    Create Private Room
                </button>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Enter Room ID"
                        className="flex-1 p-3 border-2 border-gray-300 rounded focus:border-blue-500 outline-none"
                        onChange={(e) => setRoomId(e.target.value)}
                    />
                    <button 
                        onClick={joinRoom}
                        className="bg-blue-500 text-white font-bold px-6 py-3 rounded hover:bg-blue-600 transition"
                    >
                        Join
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;