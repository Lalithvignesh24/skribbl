import { useMemo } from "react";
import { getSocket } from "../services/socketService";

export function useSocket() {
  const socket = useMemo(() => getSocket(), []);// to generate a single socket instance across the app
  return socket;
}
