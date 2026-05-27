import { createContext, useContext, useMemo, useState } from "react";

const GameContext = createContext(null);

const initialRoom = {
  id: "",
  language: "en",
  round: 1,
  totalRounds: 3,
  gameStarted: false,
  phase: "lobby",
};

export function GameProvider({ children }) {
  const [currentPlayer, setCurrentPlayer] = useState({
    id: "",
    name: "",
    avatar: "😀",
  });
  const [room, setRoom] = useState(initialRoom);
  const [players, setPlayers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [timer, setTimer] = useState(80);
  const [timerType, setTimerType] = useState(null);
  const [wordHint, setWordHint] = useState("________");
  const [activeDrawerId, setActiveDrawerId] = useState("");
  const [guessedPlayerIds, setGuessedPlayerIds] = useState([]);
  const [hasGuessedCorrectly, setHasGuessedCorrectly] = useState(false);

  const value = useMemo(
    () => ({
      currentPlayer,
      setCurrentPlayer,
      room,
      setRoom,
      players,
      setPlayers,
      messages,
      setMessages,
      timer,
      setTimer,
      timerType,
      setTimerType,
      wordHint,
      setWordHint,
      activeDrawerId,
      setActiveDrawerId,
      guessedPlayerIds,
      setGuessedPlayerIds,
      hasGuessedCorrectly,
      setHasGuessedCorrectly,
    }),
    [
      currentPlayer,
      room,
      players,
      messages,
      timer,
      timerType,
      wordHint,
      activeDrawerId,
      guessedPlayerIds,
      hasGuessedCorrectly,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used inside GameProvider");
  }
  return context;
}
