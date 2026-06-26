import { io } from "socket.io-client";
import { API_BASE_URL, getStoredUser } from "./api";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || API_BASE_URL;

export function createWorkoutSocket(role = "trainee") {
  const storedUser = getStoredUser();

  return io(SOCKET_URL, {
    transports: ["websocket", "polling"],
    query: {
      role,
      ...(storedUser?.userId ? { userId: storedUser.userId } : {})
    }
  });
}
