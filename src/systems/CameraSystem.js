import * as THREE from 'three';

export class CameraSystem {
    constructor(engine, target) {
        this.engine = engine;
        this.target = target; // The car
        this.camera = engine.camera;
        
        this.baseFOV = 75;
        this.maxFOV = 100;
        this.smoothSpeed = 0.1;
        this.offset = new THREE.Vector3(0, 3.5, 8);
        this.lookAtOffset = new THREE.Vector3(0, 1, 0);

        this.currentFOV = this.baseFOV;
        this.shakeIntensity = 0;
        this.fovBoost = 0;
    }

    update(delta) {
        if (!this.target) return;

        // Calculate target camera position based on car rotation
        const relativeOffset = this.offset.clone().applyQuaternion(this.target.mesh.quaternion);
        const targetPos = this.target.mesh.position.clone().add(relativeOffset);

        // Interpolate camera position
        this.camera.position.lerp(targetPos, this.smoothSpeed);

        // Look at car with slight offset
        const lookTarget = this.target.mesh.position.clone().add(this.lookAtOffset);
        this.camera.lookAt(lookTarget);

        // Dynamic FOV based on speed and Nitro
        const speed = this.target.chassisBody.velocity.length(); // m/s
        const speedFactor = Math.min(speed / 40, 1); 
        
        // Decay FOV boost
        this.fovBoost = THREE.MathUtils.lerp(this.fovBoost, 0, 0.05);

        const targetFOV = this.baseFOV + (this.maxFOV - this.baseFOV) * speedFactor + this.fovBoost;
        this.currentFOV = THREE.MathUtils.lerp(this.currentFOV, targetFOV, 0.05);
        this.camera.fov = this.currentFOV;
        this.camera.updateProjectionMatrix();

        // Apply Shake
        if (this.shakeIntensity > 0.1) {
            this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity;
            this.shakeIntensity *= 0.9; // Decay
        }

        // Speed tilt (Slanting camera slightly based on turn)
        const angularVel = this.target.chassisBody.angularVelocity.y;
    }

    applyShake(intensity) {
        if (intensity > 5) {
            this.shakeIntensity = Math.min(intensity * 0.1, 1.0);
        }
    }

    applyFOVPunch(amount) {
        this.fovBoost = amount;
    }
}
