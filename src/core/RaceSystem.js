import * as THREE from 'three';

export class RaceSystem {
    constructor(engine, playerCar) {
        this.engine = engine;
        this.playerCar = playerCar;
        
        this.checkpoints = [];
        this.currentCheckpointIdx = 0;
        this.raceStarted = false;
        this.isBossRace = false;
        this.currentRival = null;
        
        this.wins = 0;
        this.score = 0;
        
        this.init();
    }

    init() {
        // Build a dynamic route based on city tiles (simplified for now)
        // In a real procedural system, we'd pick a path of tiles
    }

    startRace(rival = null) {
        this.currentRival = rival;
        this.isBossRace = !!rival;
        this.generateCheckpoints();
        this.raceStarted = true;
        this.currentCheckpointIdx = 0;
        
        if (this.isBossRace && rival) {
            rival.aiPath = this.checkpoints.map(cp => cp.position);
            rival.currentPathIdx = 0;
        }

        this.updateHUD();
        console.log(this.isBossRace ? `Challenge Started: ${rival.rivalData.name}` : "Race Started!");
    }

    generateCheckpoints() {
        // Clear old checkpoints
        this.checkpoints.forEach(cp => this.engine.scene.remove(cp.mesh));
        this.checkpoints = [];

        // Simple adaptive path: 4 points based on current position to ensure a loop
        const p = this.playerCar.chassisBody.position;
        const dist = this.isBossRace ? 500 : 200; // Longer races for bosses
        
        const points = [
            new THREE.Vector3(p.x + dist, 0, p.z),
            new THREE.Vector3(p.x + dist, 0, p.z + dist),
            new THREE.Vector3(p.x, 0, p.z + dist),
            new THREE.Vector3(p.x, 0, p.z)
        ];

        points.forEach((p, i) => {
            const geometry = new THREE.TorusGeometry(5, 0.5, 16, 100);
            const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.copy(p);
            mesh.position.y = 5;
            mesh.rotation.y = Math.PI / 2;
            
            this.engine.scene.add(mesh);
            this.checkpoints.push({ position: p, mesh: mesh });
        });
    }

    update(delta) {
        if (!this.raceStarted) return;

        const currentCP = this.checkpoints[this.currentCheckpointIdx];
        if (!currentCP) return;

        // Check distance to checkpoint
        const dist = this.playerCar.chassisBody.position.distanceTo(currentCP.position);
        if (dist < 10) {
            this.currentCheckpointIdx++;
            currentCP.mesh.visible = false;
            this.score += 100;
            
            if (this.currentCheckpointIdx >= this.checkpoints.length) {
                this.winRace();
            } else {
                this.updateHUD();
            }
        }

        // Pulse effect for current checkpoint
        currentCP.mesh.scale.setScalar(1 + Math.sin(Date.now() * 0.01) * 0.1);
    }

    winRace() {
        this.raceStarted = false;
        this.wins++;
        
        let reward = 500;
        if (this.isBossRace) {
            reward = 2000;
            this.engine.blacklistManager.onWinRace(true, this.currentRival.rivalData.id);
            this.engine.ui.blacklistUI.showDopamine(`${this.currentRival.rivalData.name} DEFEATED!`, '#00ff00');
        }
        
        this.engine.blacklistManager.addBounty(reward);
        this.updateHUD();
        
        // Remove rival if boss race
        if (this.isBossRace) {
            this.engine.scene.remove(this.currentRival.mesh);
            this.engine.physicsWorld.removeBody(this.currentRival.chassisBody);
            this.currentRival = null;
        }
    }

    updateHUD() {
        const scoreEl = document.getElementById('score');
        if (scoreEl) scoreEl.innerText = `Score: ${this.score}`;
        
        const winsEl = document.getElementById('wins');
        if (winsEl) winsEl.innerText = `Wins: ${this.wins}`;
    }
}
