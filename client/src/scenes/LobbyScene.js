import Phaser from "phaser";
import { startGame } from "../api";
import { db, ref, set, onValue } from "../firebase";

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super("LobbyScene");
    }

    create() {
        this.roomId = "ok-room";
        this.joining = false;

        this.add.text(400, 40, "OFFICE OFFICE", {
            fontSize: "36px",
            fontStyle: "bold",
            color: "#f5c542"
        }).setOrigin(0.5);

        this.add.text(400, 80, "Fake Work. Real Drama.", {
            fontSize: "16px",
            color: "#cccccc"
        }).setOrigin(0.5);

        this.add.rectangle(400, 130, 300, 40, 0x2a2a2a);
        this.add.text(400, 130, "Room Code: DEMO-ROOM", {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5);

        // Initialize Room Reference
        this.roomRef = ref(db, `rooms/${this.roomId}`);
        this.playersRef = ref(db, `rooms/${this.roomId}/players`);

        // Create UI Containers for the list
        this.add.rectangle(400, 260, 320, 220, 0x2a2a2a);
        this.add.text(400, 180, "👥 Employees", {
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);

        this.countText = this.add.text(400, 220, "Employees (0/8)", {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5);

        this.playersListText = this.add.text(400, 260, '', {
            fontSize: "16px",
            color: "#f5c542"
        }).setOrigin(0.5);

        // Start Button (Hidden by default)
        this.startBtnBg = this.add.rectangle(400, 420, 200, 50, 0x2ecc71).setVisible(false);
        this.startBtnBg.setInteractive({ useHandCursor: true });

        this.startBtnText = this.add.text(400, 420, "START WORK", {
            fontSize: "18px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5).setVisible(false);

        this.startBtnBg.on("pointerover", () => this.startBtnBg.setFillStyle(0x27ae60));
        this.startBtnBg.on("pointerout", () => this.startBtnBg.setFillStyle(0x2ecc71));

        this.startBtnBg.on("pointerdown", () => {
            startGame(this.roomId);
        });

        this.statusText = this.add.text(400, 480,
            "Waiting for host to start the game…",
            { fontSize: "14px", color: "#aaaaaa" }
        ).setOrigin(0.5);

        // Check for existing player name
        this.playerName = localStorage.getItem('officeoffice_playerName') || '';

        if (this.playerName) {
            this.initPlayer();
        } else {
            this.showNameInputUI();
        }

        // Listener for transition to role reveal (Global)
        const phaseRef = ref(db, `rooms/${this.roomId}/gameState/phase`);
        onValue(phaseRef, snap => {
            if (snap.val() === "ROLE_REVEAL") {
                this.scene.stop("LobbyScene");
                this.scene.start("RoleScene");
            }
        });
    }

    showNameInputUI() {
        // Dark Overlay Background for input
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.85).setDepth(1000);

        const welcomeText = this.add.text(400, 200, "WELCOME TO THE OFFICE", {
            fontSize: "24px", color: "#f5c542", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1001);

        const nameInput = this.add.dom(400, 280, 'input', {
            type: 'text',
            placeholder: 'Enter Your Name...',
            width: '300px',
            padding: '10px',
            fontSize: '18px',
            borderRadius: '5px',
            border: '2px solid #f5c542',
            backgroundColor: '#1a1a1a',
            color: '#ffffff',
            textAlign: 'center'
        }).setDepth(1001);

        const joinBtn = this.add.rectangle(400, 360, 200, 50, 0xf5c542)
            .setInteractive({ useHandCursor: true })
            .setDepth(1001);

        const joinText = this.add.text(400, 360, "JOIN ROOM", {
            fontSize: "18px", color: "#000000", fontStyle: "bold"
        }).setOrigin(0.5).setDepth(1001);

        joinBtn.on("pointerdown", () => {
            const enteredName = nameInput.node.value.trim();
            if (enteredName.length < 2) return alert("Please enter a valid name!");

            this.playerName = enteredName;
            localStorage.setItem('officeoffice_playerName', this.playerName);

            // Cleanup UI
            overlay.destroy();
            welcomeText.destroy();
            nameInput.destroy();
            joinBtn.destroy();
            joinText.destroy();

            this.initPlayer();
        });
    }

    initPlayer() {
        this.playerId = localStorage.getItem("officeoffice_playerId");

        // Try to sync/re-join
        onValue(this.playersRef, snapshot => {
            const players = snapshot.val() || {};
            let found = false;

            for (const [id, player] of Object.entries(players)) {
                if (player.name === this.playerName) {
                    this.playerId = id;
                    localStorage.setItem("officeoffice_playerId", this.playerId);
                    found = true;
                    break;
                }
            }

            if (!found && !this.joining) {
                this.joining = true;
                this.addPlayerToDB();
            }

            this.setupGameStateListeners();
        }, { onlyOnce: true });
    }

    addPlayerToDB() {
        const newId = 'player_' + Math.random().toString(36).substr(2, 9);
        this.playerId = newId;
        localStorage.setItem("officeoffice_playerId", newId);

        set(ref(db, `rooms/${this.roomId}/players/${newId}`), {
            name: this.playerName
        }).then(() => {
            this.setupHostCheck();
        });
    }

    setupHostCheck() {
        onValue(this.roomRef, snap => {
            const room = snap.val();
            if (!room?.hostId) {
                set(ref(db, `rooms/${this.roomId}/hostId`), this.playerId);
            }
        }, { onlyOnce: true });
    }

    setupGameStateListeners() {
        // Host check
        onValue(ref(db, `rooms/${this.roomId}/hostId`), snap => {
            const isHost = snap.val() === this.playerId;
            if (this.startBtnBg) this.startBtnBg.setVisible(isHost);
            if (this.startBtnText) this.startBtnText.setVisible(isHost);
        });

        // Player list updates
        onValue(this.playersRef, snapshot => {
            const players = snapshot.val() || {};
            const count = Object.keys(players).length;
            if (this.countText) this.countText.setText(`Employees (${count}/8)`);
            const names = Object.values(players).map(p => p.name).join('\n');
            if (this.playersListText) this.playersListText.setText(names);
        });

        // Handle window close
        window.addEventListener("beforeunload", () => {
            if (this.playerId) {
                set(ref(db, `rooms/${this.roomId}/players/${this.playerId}`), null);
            }
        });
    }
}
