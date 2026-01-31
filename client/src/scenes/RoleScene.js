import Phaser from "phaser";
import { db, ref, onValue } from "../firebase";

export default class RoleScene extends Phaser.Scene {
  constructor() {
    super("RoleScene");
  }

  create() {
    const roomId = "demo-room";
    const playerId = localStorage.getItem("officeoffice_playerId");
    console.log("Player ID in RoleScene:", playerId);
    this.add.text(400, 120, "YOUR ROLE", {
      fontSize: "28px",
      color: "#ffffff",
      fontStyle: "bold"
    }).setOrigin(0.5);

    const roleText = this.add.text(400, 260, "Loading...", {
      fontSize: "26px",
      color: "#f5c542"
    }).setOrigin(0.5);

    const roleRef = ref(db, `rooms/${roomId}/players/${playerId}/role`);

    onValue(roleRef, snap => {
      const role = snap.val();
      console.log("Assigned role:", role);
      if (!role) return;

      if (role === "FAKE") {
        roleText.setText("🕵️ FAKE EMPLOYEE\nBlend in. Fake work.");
      } else {
        roleText.setText("👤 GOOD EMPLOYEE\nDo your tasks honestly.");
      }

      // Route all players to TaskScene (Skip StrategyScene)
      this.time.delayedCall(3000, () => {
        this.scene.start("TaskScene");
        this.scene.stop();
      });
    }, { onlyOnce: true });
  }
}
