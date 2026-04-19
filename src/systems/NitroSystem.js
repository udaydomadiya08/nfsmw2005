import * as CANNON from 'cannon-es';

export class NitroSystem {
    constructor(car) {
        this.car = car;
        this.maxAmount = 100;
        this.amount = 100;
        this.regenRate = 5; // per second
        this.consumeRate = 30; // per second
        this.isBoosting = false;
        
        this.nitroImpulse = 5000; // Initial kick
        this.nitroForce = 4000; // Sustained force
        this.cooldown = false;
    }

    update(delta, input) {
        if (input.keys.nitro && this.amount > 0 && !this.cooldown) {
            if (!this.isBoosting) {
                // Initial kick
                this.applyImpulse();
                this.isBoosting = true;
                
                // Visual Feedback
                if (this.car.engine.cameraSystem) {
                    this.car.engine.cameraSystem.applyFOVPunch(15);
                }
                this.car.engine.postProcessing.triggerFlash = true; // Flag for main loop
            }
            
            this.applyContinuousForce();
            this.amount -= this.consumeRate * delta;
            
            if (this.amount <= 0) {
                this.amount = 0;
                this.stopBoost();
            }
        } else {
            this.stopBoost();
            if (this.amount < this.maxAmount) {
                this.amount += this.regenRate * delta;
            }
        }

        // Update UI (Bridge to HUD)
        const nitroBar = document.getElementById('nitro-bar');
        if (nitroBar) {
            nitroBar.style.width = `${(this.amount / this.maxAmount) * 100}%`;
        }
    }

    applyImpulse() {
        const forward = new CANNON.Vec3(0, 0, -1);
        this.car.chassisBody.quaternion.vmult(forward, forward);
        forward.scale(this.nitroImpulse, forward);
        this.car.chassisBody.applyImpulse(forward, this.car.chassisBody.position);
    }

    applyContinuousForce() {
        const forward = new CANNON.Vec3(0, 0, -1);
        this.car.chassisBody.quaternion.vmult(forward, forward);
        forward.scale(this.nitroForce, forward);
        this.car.chassisBody.applyForce(forward, this.car.chassisBody.position);
    }

    stopBoost() {
        this.isBoosting = false;
    }
}
