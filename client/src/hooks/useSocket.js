import { useMemo } from "react";
import { getSocket } from "../services/socketService";

export function useSocket() {
  const socket = useMemo(() => getSocket(), []);
  return socket;
}
