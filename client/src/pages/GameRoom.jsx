import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import Canvas from '../components/Canvas';
import Chat from '../components/Chat';

const socket = io.connect("http://localhost:3001");

const GameRoom = () => {
    const { roomId } = useParams();
    const location = useLocation();
    const playerName = location.state?.name || "Anonymous";

    // Game States
    const [players, setPlayers] = useState([]);
    const [gameStarted, setGameStarted] = useState(false);
    const [isDrawer, setIsDrawer] = useState(false);
    const [currentWord, setCurrentWord] = useState("");
    const [timeLeft, setTimeLeft] = useState(80);
    
    // NEW: Word Selection State
    const [wordOptions, setWordOptions] = useState([]);

    useEffect(() => {
        socket.emit('join_room', { roomId, name: playerName });

        socket.on('update_players', (playerList) => setPlayers(playerList));
        socket.on('timer_update', (time) => setTimeLeft(time));

        // Listen for the 3 word choices (Drawer only)
        socket.on('choose_word', (options) => {
            setWordOptions(options);
            setGameStarted(false); // Ensure game doesn't start until pick
        });

        socket.on('game_started', (data) => {
            setGameStarted(true);
            setWordOptions([]); // Clear options once game starts
            setIsDrawer(data.drawerId === socket.id);
            setCurrentWord(data.wordDisplay);
        });

        socket.on('secret_word', (word) => setCurrentWord(word));

        socket.on('round_ended', (data) => {
            setGameStarted(false);
            setWordOptions([]);
            alert(`Round Over! The word was: ${data.word}`);
        });

        return () => {
            socket.off('update_players');
            socket.off('choose_word');
            socket.off('game_started');
            socket.off('secret_word');
            socket.off('timer_update');
            socket.off('round_ended');
        };
    }, [roomId, playerName]);

    const handleStartGame = () => socket.emit('start_game', roomId);

    // NEW: Function to handle word selection
    const handleSelectWord = (word) => {
        socket.emit('word_chosen', { roomId, word });
        setWordOptions([]);
    };

    return (
        <div className="min-h-screen bg-blue-600 p-4 flex flex-col items-center">
            {/* Header / Timer */}
            <div className="w-full max-w-7xl flex justify-between items-center mb-4 px-4">
                <div className="flex items-center gap-3 bg-white p-2 rounded-full shadow-lg border-2 border-yellow-400">
                    <div className="bg-yellow-400 text-white w-12 h-12 rounded-full flex items-center justify-center font-black text-xl">
                        {timeLeft}
                    </div>
                    <span className="pr-4 font-bold text-gray-700 uppercase text-xs tracking-widest">Time</span>
                </div>
                <div className="text-white font-bold bg-blue-900 px-6 py-2 rounded-full shadow-md border border-blue-400">
                    Room: <span className="text-yellow-400 font-mono">{roomId}</span>
                </div>
            </div>

            <div className="max-w-7xl w-full bg-gray-200 rounded-xl shadow-2xl p-4 flex flex-col lg:flex-row gap-4 relative overflow-hidden">
                
                {/* 1. START BUTTON OVERLAY (Only Owner) */}
                {!gameStarted && wordOptions.length === 0 && players.length > 0 && players[0].id === socket.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 z-30 rounded-xl">
                        <button onClick={handleStartGame} className="bg-green-500 hover:bg-green-600 text-white text-4xl font-black py-8 px-16 rounded-full shadow-2xl transition animate-pulse">
                            START GAME!
                        </button>
                    </div>
                )}

                {/* 2. WORD SELECTION OVERLAY (Only Drawer) */}
                {wordOptions.length > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-80 z-40 rounded-xl">
                        <div className="bg-white p-8 rounded-2xl text-center shadow-2xl">
                            <h2 className="text-2xl font-black mb-6 text-gray-700 uppercase">Choose a word to draw</h2>
                            <div className="flex flex-col gap-4">
                                {wordOptions.map((word) => (
                                    <button
                                        key={word}
                                        onClick={() => handleSelectWord(word)}
                                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-8 rounded-lg text-xl transition transform hover:scale-105"
                                    >
                                        {word}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Sidebar */}
                <div className="w-full lg:w-1/5 bg-white rounded-lg p-4 border-2 border-gray-300 shadow-md">
                    <h2 className="font-black border-b-2 border-gray-100 pb-2 mb-4 text-gray-600 uppercase text-xl">Players</h2>
                    <div className="space-y-3">
                        {players.map((p) => (
                            <div key={p.id} className={`flex justify-between items-center p-3 rounded-lg border-2 ${p.id === socket.id ? 'bg-blue-50 border-blue-400' : 'bg-gray-50 border-gray-200'}`}>
                                <span className="font-bold text-gray-800">{p.name} {p.id === socket.id ? "(You)" : ""}</span>
                                <span className="text-blue-700 font-black">{p.points}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-white rounded-lg border-2 border-gray-300 shadow-md overflow-hidden">
                    <div className="bg-gray-800 text-white p-4 text-center font-mono font-bold tracking-[0.6em] text-4xl min-h-[80px] flex items-center justify-center">
                        {currentWord || (wordOptions.length > 0 ? "CHOOSING..." : "WAITING...")}
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4 bg-gray-50">
                        <Canvas roomId={roomId} socket={socket} isDrawer={isDrawer}/>
                    </div>
                </div>

                {/* Chat */}
                <div className="w-full lg:w-1/4">
                    <Chat socket={socket} roomId={roomId} playerName={playerName} />
                </div>
            </div>
        </div>
    );
};

export default GameRoom;