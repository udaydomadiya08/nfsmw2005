import * as THREE from 'three';

export class MissionSystem {
    constructor(engine) {
        this.engine = engine;
        this.activeMission = null;
        this.timer = 0;
        this.score = 0;
        
        this.initHUD();
    }

    initHUD() {
        const hud = document.createElement('div');
        hud.id = 'mission-hud';
        hud.style.cssText = `
            position: absolute; top: 120px; left: 30px;
            color: #00f2ff; font-family: 'Outfit', sans-serif;
            font-weight: 900; text-shadow: 0 0 10px rgba(0,242,255,0.5);
            display: none; background: rgba(0,0,0,0.5); padding: 15px;
            border-left: 4px solid #00f2ff;
        `;
        document.body.appendChild(hud);
        this.hud = hud;
    }

    startMission(type) {
        this.activeMission = {
            type: type,
            target: 1000, // Distance or Speed
            current: 0,
            startTime: Date.now()
        };
        this.timer = type === 'Tollbooth' ? 60 : 0;
        this.hud.style.display = 'block';
        console.log(`Mission Started: ${type}`);
    }

    update(delta) {
        if (!this.activeMission) return;

        const player = this.engine.entities[0];
        if (!player) return;

        const speedKmh = player.chassisBody.velocity.length() * 3.6;

        if (this.activeMission.type === 'Tollbooth') {
            this.timer -= delta;
            this.hud.innerHTML = `
                <div style="font-size:12px; color:#aaa;">TOLLBOOTH CHALLENGE</div>
                <div style="font-size:32px;">${Math.ceil(this.timer)}s</div>
                <div style="font-size:14px;">REACH NEXT STATION</div>
            `;
            if (this.timer <= 0) this.failMission();
        } else if (this.activeMission.type === 'Speedtrap') {
            this.activeMission.current = Math.max(this.activeMission.current, speedKmh);
            this.hud.innerHTML = `
                <div style="font-size:12px; color:#aaa;">SPEEDTRAP</div>
                <div style="font-size:32px;">${Math.floor(this.activeMission.current)} KM/H</div>
                <div style="font-size:14px;">TOP SPEED RECORD</div>
            `;
        }
    }

    failMission() {
        this.engine.ui.blacklistUI.showDopamine('MISSION FAILED', '#ff3e3e');
        this.activeMission = null;
        this.hud.style.display = 'none';
    }

    completeMission() {
        const reward = 5000;
        this.engine.blacklistManager.addBounty(reward);
        this.engine.ui.blacklistUI.showDopamine(`MISSION COMPLETE: +${reward} BOUNTY`, '#00f2ff');
        this.activeMission = null;
        this.hud.style.display = 'none';
    }
}
