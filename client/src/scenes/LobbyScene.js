import Phaser from "phaser";
import { startGame } from "../api";
import { db, ref, set, onValue } from "../firebase";

export default class LobbyScene extends Phaser.Scene {
    constructor() {
        super("LobbyScene");
    }

    create() {

        const roomId = "demo-room";
        // Only set hostId if not already set
        const roomRef = ref(db, `rooms/${roomId}`);



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

        this.add.rectangle(400, 260, 320, 220, 0x2a2a2a);
        this.add.text(400, 180, "👥 Employees", {
            fontSize: "18px",
            color: "#ffffff"
        }).setOrigin(0.5);


        // Check if player already exists in DB (by name)
        const playersRef = ref(db, `rooms/${roomId}/players`);
        // Ask for player name
        let playerName = localStorage.getItem('officeoffice_playerName') || '';
        if (!playerName) {
            playerName = prompt('Enter your name:') || 'Anonymous';
            localStorage.setItem('officeoffice_playerName', playerName);
        }


        let playerId = null;
        let addPlayerToDB = () => { };

        addPlayerToDB = () => {
            // If playerId is still null, generate a new one and add
            if (!playerId) {
                playerId = 'player_' + Math.random().toString(36).substr(2, 9);
                localStorage.setItem("officeoffice_playerId", playerId);
                set(ref(db, `rooms/${roomId}/players/${playerId}`), {
                    name: playerName
                });
            }
        };

        const assignHostIfNeeded = () => {
            onValue(roomRef, snap => {
                const room = snap.val();
                if (!room?.hostId) {
                    set(ref(db, `rooms/${roomId}/hostId`), playerId);
                }
            }, { onlyOnce: true });
        };
        // Try to find existing player by name
        onValue(playersRef, snapshot => {
            const players = snapshot.val() || {};

            for (const [id, player] of Object.entries(players)) {
                if (player.name === playerName) {
                    playerId = id;

                    // 🔥 ADD THIS LINE
                    localStorage.setItem("officeoffice_playerId", playerId);

                    break;
                }
            }

            if (!playerId) {
                addPlayerToDB();
                assignHostIfNeeded();
            }
        }, { onlyOnce: true });

        let isHost = false;

        onValue(ref(db, `rooms/${roomId}/hostId`), snap => {
            isHost = snap.val() === playerId;
            startBtnBg.setVisible(isHost);
            startBtnText.setVisible(isHost);
        });
        // Show player count and list inside the rectangle (centered vertically)
        let count = 0;
        this.countText = this.add.text(400, 220, `Employees (${count}/8)`, {
            fontSize: "16px",
            color: "#ffffff"
        }).setOrigin(0.5);

        this.playersListText = this.add.text(400, 260, '', {
            fontSize: "16px",
            color: "#f5c542"
        }).setOrigin(0.5);

        onValue(playersRef, snapshot => {
            const players = snapshot.val() || {};
            count = Object.keys(players).length;
            this.countText.setText(`Employees (${count}/8)`);
            // Show all player names in the box
            const names = Object.values(players).map(p => p.name).join('\n');
            this.playersListText.setText(names);
        });
        // Remove old tween for playersText (no longer used)
        const startBtnBg = this.add.rectangle(400, 420, 200, 50, 0x2ecc71);
        startBtnBg.setInteractive({ useHandCursor: true });

        const startBtnText = this.add.text(400, 420, "START WORK", {
            fontSize: "18px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5);
        startBtnBg.on("pointerover", () => {
            startBtnBg.setFillStyle(0x27ae60);
        });

        startBtnBg.on("pointerout", () => {
            startBtnBg.setFillStyle(0x2ecc71);
        });

        startBtnText.setInteractive();
        startBtnText.on("pointerdown", () => {
            if (!isHost) return;
            startGame(roomId);
        });

        this.statusText = this.add.text(400, 480,
            "Waiting for host to start the game…",
            { fontSize: "14px", color: "#aaaaaa" }
        ).setOrigin(0.5);

        window.addEventListener("beforeunload", () => {
            set(ref(db, `rooms/${roomId}/players/${playerId}`), null);
        });

        // (moved above)


        // (Already set above, remove durplicate)

        const phaseRef = ref(db, `rooms/${roomId}/gameState/phase`);

        onValue(phaseRef, snap => {
            if (snap.val() === "ROLE_REVEAL") {
                this.scene.stop("LobbyScene");
                this.scene.start("RoleScene");
            }
        });


    }
}
