import { db, ref, set } from "./firebase";

export function startGame(roomId) {
  set(ref(db, `rooms/${roomId}/gameState/phase`), "TASK");
}
