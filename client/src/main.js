import Phaser from "phaser";
import { startGame } from "./api";
import LobbyScene from "./scenes/LobbyScene";
import RoleScene from "./scenes/RoleScene";
import ResultScene from "./scenes/ResultScene";
import AuditorScene from "./scenes/AuditorScene";
import TaskScene from "./scenes/TaskScene";
class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  create() {
    // UI / text
    this.add.text(100, 100, "Office Office Game");

    // 🔥 CALL BACKEND WHEN GAME STARTS
    startGame("ok-room");
  }
}

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#1e1e1e",
  parent: "game-container",
  scene: [LobbyScene, TaskScene,RoleScene,AuditorScene, ResultScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  dom: {
    createContainer: true
  },
  input: {
    keyboard: {
      capture: [] // Don't capture ANY keys - allows HTML inputs to work
    }
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
