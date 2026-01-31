import { db, ref, set } from "./firebase";

export async function startGame(roomId) {
  await fetch("http://localhost:8000/game/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomId })
  });
}
  