import * as THREE from 'three';

export class CameraSystem {
    constructor(camera, target) {
        this.camera = camera;
        this.target = target;
        
        this.offset = new THREE.Vector3(0, 2.5, -7);
        this.lookAtOffset = new THREE.Vector3(0, 1, 5);
        
        this.smoothSpeed = 0.12;
        this.currentPosition = new THREE.Vector3();
        this.currentLookAt = new THREE.Vector3();
        
        this.baseFov = 75;
        this.shakeIntensity = 0;
        this.collisionShake = 0;
        
        this.tilt = 0;
        this.maxTilt = 0.05;
    }

    applyCollisionShake(intensity) {
        this.collisionShake = intensity;
    }

    update(dt, velocity, isNitroActive = false, steeringValue = 0, cinematicTime = -1) {
        if (!this.target) return;

        if (cinematicTime > 0) {
            this.handleCinematicIntro(cinematicTime);
            return;
        }

        const speedKph = velocity.length() * 3.6;
        
        // Dynamic FOV
        let targetFov = this.baseFov + (speedKph / 300) * 20;
        if (isNitroActive) targetFov += 15;
        this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.1);
        this.camera.updateProjectionMatrix();

        // Position
        const idealOffset = this.offset.clone();
        this.tilt = THREE.MathUtils.lerp(this.tilt, steeringValue * this.maxTilt, 0.05);
        idealOffset.x += this.tilt * 10;
        idealOffset.applyQuaternion(this.target.quaternion);
        const idealPosition = this.target.position.clone().add(idealOffset);

        // LookAt
        const idealLookAtOffset = this.lookAtOffset.clone();
        idealLookAtOffset.applyQuaternion(this.target.quaternion);
        const idealLookAt = this.target.position.clone().add(idealLookAtOffset);

        // Smoothing
        this.currentPosition.lerp(idealPosition, this.smoothSpeed);
        this.currentLookAt.lerp(idealLookAt, this.smoothSpeed);

        // Shake
        this.shakeIntensity = (speedKph > 150 ? ((speedKph - 150) / 150) * 0.05 : 0);
        if (isNitroActive) this.shakeIntensity += 0.08;
        this.shakeIntensity += this.collisionShake;
        this.collisionShake = THREE.MathUtils.lerp(this.collisionShake, 0, 0.1);

        if (this.shakeIntensity > 0) {
            this.currentPosition.x += (Math.random() - 0.5) * this.shakeIntensity;
            this.currentPosition.y += (Math.random() - 0.5) * this.shakeIntensity;
        }

        this.camera.position.copy(this.currentPosition);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(this.currentLookAt);
    }

    handleCinematicIntro(time) {
        // Simple orbital fly-by
        const angle = time * 2;
        const radius = 8 + time * 2;
        this.camera.position.set(
            this.target.position.x + Math.sin(angle) * radius,
            this.target.position.y + 3,
            this.target.position.z + Math.cos(angle) * radius
        );
        this.camera.lookAt(this.target.position);
        this.currentPosition.copy(this.camera.position); // Sync for transition
    }
}
