import Phaser from "phaser";
import { startGame } from "./api";
import LobbyScene from "./scenes/LobbyScene";
import TaskScene from "./scenes/TaskScene";
import VotingScene from "./scenes/VotingScene";
import ResultScene from "./scenes/ResultScene";
import RoleScene from "./scenes/RoleScene";
import WorkScene from "./scenes/WorkScene";
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    // UI / text
    this.add.text(100, 100, "Office Office Game");

    // 🔥 CALL BACKEND WHEN GAME STARTS
    startGame("demo-room");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#1e1e1e",
  parent: "game-container", // Attach Phaser to the div in index.html
  scene: [LobbyScene, TaskScene, RoleScene, WorkScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true   // ⭐ REQUIRED ⭐
  },
  physics: {
    default: "arcade",
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  }
};

const game = new Phaser.Game(config);

window.addEventListener("resize", () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});
