import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import { AVATARS, LANGUAGES } from "../utils/constants";
import { useGameContext } from "../context/GameContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { setCurrentPlayer, setRoom } = useGameContext();
  const [name, setName] = useState("");
  const [roomIdInput, setRoomIdInput] = useState("");
  const [avatarIndex, setAvatarIndex] = useState(0);
  const [language, setLanguage] = useState("en");
  const [createdRoomId, setCreatedRoomId] = useState("");
  const [error, setError] = useState("");
  const nameInputRef = useRef(null);

  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const goToRoom = (roomId, mode) => {
    const cleanName = name.trim();
    const cleanRoomId = roomId.trim().toUpperCase();
    if (!cleanName) {
      setError("Please enter your name.");
      return;
    }
    if (!cleanRoomId) {
      setError("Please enter a room ID.");
      return;
    }

    setError("");
    setCurrentPlayer({
      id: "",
      name: cleanName,
      avatar: AVATARS[avatarIndex],
    });
    setRoom((prev) => ({ ...prev, id: cleanRoomId, language }));
    navigate(`/game/${cleanRoomId}`, { state: { mode } });
  };

  const generateRoomId = () => Math.random().toString(36).slice(2, 8).toUpperCase();

  const createRoom = () => {
    const nextRoomId = generateRoomId();
    setCreatedRoomId(nextRoomId);
    setRoomIdInput(nextRoomId);
    goToRoom(nextRoomId, "create");
  };

  const joinRoom = () => {
    goToRoom(roomIdInput, "join");
  };

  const copyCreatedRoomId = async () => {
    if (!createdRoomId) return;
    await navigator.clipboard.writeText(createdRoomId);
  };

  return (
    <div className="pattern-bg flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-5">
        <h1 className="mb-6 text-center text-5xl font-black tracking-tight text-yellow-300">skribbl.io</h1>
        <div className="space-y-3">
          <input
            ref={nameInputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Username"
            className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-sky-500"
          />
          <input
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            placeholder="Room ID"
            className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 uppercase text-slate-900 outline-none focus:border-sky-500"
          />
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2 text-slate-900 outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
          <div className="flex items-center justify-center gap-3 rounded-2xl bg-blue-900/70 p-3">
            <button onClick={() => setAvatarIndex((v) => (v - 1 + AVATARS.length) % AVATARS.length)}>◀</button>
            <span className="text-5xl">{AVATARS[avatarIndex]}</span>
            <button onClick={() => setAvatarIndex((v) => (v + 1) % AVATARS.length)}>▶</button>
          </div>
          <Button
            className="w-full bg-lime-400 py-3 text-xl font-bold text-slate-900 hover:bg-lime-300"
            onClick={createRoom}
          >
            Create Room
          </Button>
          <Button
            className="w-full bg-sky-500 py-3 text-white hover:bg-sky-400"
            onClick={joinRoom}
          >
            Join Room
          </Button>
          {!!createdRoomId && (
            <div className="rounded-xl bg-blue-900/70 p-3 text-sm">
              <p className="mb-2 text-blue-100">
                Room ID: <span className="font-bold text-yellow-300">{createdRoomId}</span>
              </p>
              <Button onClick={copyCreatedRoomId} className="w-full bg-indigo-500 text-white hover:bg-indigo-400">
                Copy Room ID
              </Button>
            </div>
          )}
          {!!error && <p className="text-sm font-medium text-rose-300">{error}</p>}
        </div>
      </Card>
    </div>
  );
}
