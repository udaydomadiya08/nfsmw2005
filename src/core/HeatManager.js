export class HeatManager {
    constructor() {
        this.heatLevel = 1; // 1 to 5
        this.heatPoints = 0;
        this.pointsToNextLevel = [0, 100, 300, 700, 1500, 3100];
        
        this.isBeingChased = false;
        this.timeInPursuit = 0;
        
        this.uiBlinkTimer = 0;
    }

    update(delta, car, policeUnits) {
        const speedKmh = car.chassisBody.velocity.length() * 3.6;
        
        // Passive heat gain if being chased
        if (this.isBeingChased) {
            this.timeInPursuit += delta;
            this.increaseHeat(delta * 2); // Slow gain while in chase
        }

        // Speed-based heat gain
        if (speedKmh > 120) {
            this.increaseHeat(delta * (speedKmh / 100));
        }

        // Check if any police unit is close
        this.isBeingChased = policeUnits.some(p => p.chassisBody.position.distanceTo(car.chassisBody.position) < 50);

        this.updateUI(delta);
    }

    increaseHeat(amount) {
        this.heatPoints += amount;
        
        const nextLevelPoints = this.pointsToNextLevel[this.heatLevel] || Infinity;
        if (this.heatPoints >= nextLevelPoints && this.heatLevel < 5) {
            this.heatLevel++;
            console.log(`Heat Level Increased: ${this.heatLevel}`);
        }
    }

    addCollisionHeat() {
        this.increaseHeat(20);
    }

    updateUI(delta) {
        const heatIcon = document.getElementById('heat-level');
        const heatBar = document.getElementById('heat-bar');
        
        if (heatIcon) heatIcon.innerText = `X${this.heatLevel}`;
        if (heatBar) {
            const currentLevelMin = this.pointsToNextLevel[this.heatLevel - 1] || 0;
            const currentLevelMax = this.pointsToNextLevel[this.heatLevel] || 1;
            const progress = (this.heatPoints - currentLevelMin) / (currentLevelMax - currentLevelMin);
            heatBar.style.width = `${Math.min(progress, 1) * 100}%`;
        }

        // Blink effect if being chased
        if (this.isBeingChased) {
            this.uiBlinkTimer += delta * 5;
            const opacity = 0.5 + Math.sin(this.uiBlinkTimer) * 0.5;
            if (heatIcon) heatIcon.style.opacity = opacity;
        } else {
            if (heatIcon) heatIcon.style.opacity = 1;
        }
    }
}
