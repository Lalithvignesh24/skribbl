import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Canvas from '../components/Canvas';

const socket = io.connect("http://localhost:3001");

const GameRoom = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const playerName = location.state?.name || "Anonymous";

    const [players, setPlayers] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [isDrawer, setIsDrawer] = useState(false);
    const [currentWord, setCurrentWord] = useState("");

    useEffect(() => {
        socket.emit('join_room', { roomId, name: playerName });

        socket.on('update_players', (playerList) => {
            setPlayers(playerList);
        });

        socket.on('game_started', (data) => {
            setGameStarted(true);
            setIsDrawer(data.drawerId === socket.id);
            setCurrentWord(data.wordDisplay);
        });

        socket.on('secret_word', (word) => {
            setCurrentWord(word);
        });

        return () => {
            socket.off('update_players');
            socket.off('game_started');
            socket.off('secret_word');
        };
    }, [roomId, playerName]);

    const handleStartGame = () => {
        socket.emit('start_game', roomId);
    };

    return (
        <div className="min-h-screen bg-blue-500 p-6 flex flex-col items-center">
            <div className="max-w-6xl w-full bg-gray-100 rounded-lg shadow-xl p-4 flex flex-col md:flex-row gap-4 relative">
                
                {/* START OVERLAY: Only for the owner/first player [cite: 223, 370] */}
                {!gameStarted && players.length > 0 && players[0].id === socket.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-60 z-20 rounded-lg">
                        <button 
                            onClick={handleStartGame}
                            className="bg-green-500 hover:bg-green-600 text-white text-3xl font-black py-6 px-12 rounded-full shadow-2xl transform hover:scale-110 transition duration-200"
                        >
                            START GAME
                        </button>
                    </div>
                )}

                {/* Left Sidebar: Player List [cite: 204, 396] */}
                <div className="w-full md:w-1/4 bg-white rounded p-4 border-2 border-gray-300 shadow-sm">
                    <h2 className="font-bold border-b pb-2 mb-4 text-gray-700 uppercase tracking-wider">Players</h2>
                    <div className="space-y-2">
                        {players.map((p) => (
                            <div 
                                key={p.id} 
                                className={`flex justify-between p-2 rounded border ${p.id === socket.id ? 'bg-blue-100 border-blue-400' : 'bg-gray-50 border-gray-200'}`}
                            >
                                <span className="font-bold text-gray-800">
                                    {p.name} {p.id === socket.id ? "(You)" : ""}
                                </span>
                                <span className="text-blue-600 font-black">{p.points}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Center: Main Game Area [cite: 187, 290] */}
                <div className="flex-1 flex flex-col bg-white rounded border-2 border-gray-300 shadow-sm overflow-hidden">
                    <div className="bg-gray-800 text-white p-3 text-center font-mono font-bold tracking-[0.4em] text-3xl min-h-[60px]">
                        {currentWord || "WAITING..."}
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <Canvas roomId={roomId} socket={socket} />
                    </div>
                </div>
            </div>

            <div className="mt-4 text-center text-white font-bold bg-blue-900 px-6 py-2 rounded-full shadow-lg">
                Room ID: <span className="select-all font-mono">{roomId}</span>
            </div>
        </div>
    );
};

export default GameRoom;