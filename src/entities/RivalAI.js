import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Car } from './Car.js';

export class RivalAI extends Car {
    constructor(engine, input, rivalData) {
        super(engine, input);
        this.rivalData = rivalData;
        
        this.isAI = true;
        this.aiPath = []; // Checkpoints from RaceSystem
        this.currentPathIdx = 0;
        
        // Elite AI Stats based on Difficulty
        this.difficulty = rivalData.difficulty || 1;
        this.topSpeedBonus = this.difficulty * 0.5;
        this.torqueBonus = this.difficulty * 2;
        
        // Rubber-banding state
        this.rubberBandScale = 1.0;
    }

    update(delta, playerCar) {
        if (!playerCar) return;

        this.handleRubberBanding(playerCar);
        this.handleAISteering(delta, playerCar);
        this.handleAINitro(delta, playerCar);
        this.handleRecovery(delta);

        super.update(delta); // Run physics and visual sync from Car.js
    }

    handleRubberBanding(playerCar) {
        const dist = this.chassisBody.position.distanceTo(playerCar.chassisBody.position);
        const isBehind = this.chassisBody.position.z > playerCar.chassisBody.position.z; // Simplified

        if (isBehind && dist > 30) {
            this.rubberBandScale = 1.0 + (dist / 100); // Speed up if far behind
        } else if (!isBehind && dist > 50) {
            this.rubberBandScale = 0.8; // Slow down slightly if far ahead (fairness)
        } else {
            this.rubberBandScale = 1.0;
        }

        // Apply bonus torque
        const forward = new CANNON.Vec3(0, 0, -1);
        this.chassisBody.quaternion.vmult(forward, forward);
        forward.scale(this.torqueBonus * this.rubberBandScale * 100, forward);
        this.chassisBody.applyForce(forward, this.chassisBody.position);
    }

    handleAISteering(delta, playerCar) {
        const target = this.aiPath[this.currentPathIdx];
        if (!target) return;

        const toTarget = target.vsub(this.chassisBody.position);
        const dist = toTarget.length();
        
        if (dist < 15) {
            this.currentPathIdx = (this.currentPathIdx + 1) % this.aiPath.length;
        }

        toTarget.normalize();
        
        // Relative heading
        const localForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.mesh.quaternion);
        const targetDir = new THREE.Vector3(toTarget.x, 0, toTarget.z).normalize();
        
        const dot = localForward.dot(targetDir);
        const cross = localForward.cross(targetDir);

        this.input.keys.forward = true;
        
        // Steering logic
        const steerThreshold = 0.1;
        this.input.keys.left = cross.y > steerThreshold;
        this.input.keys.right = cross.y < -steerThreshold;

        // Adaptive cornering (Boost friction in turns)
        const isTurning = Math.abs(cross.y) > 0.3;
        const driftFriction = 3.0; // Extra grip for AI
        this.vehicle.wheelInfos.forEach(w => w.frictionSlip = isTurning ? driftFriction : 1.4);
    }

    handleAINitro(delta, playerCar) {
        const dist = this.chassisBody.position.distanceTo(playerCar.chassisBody.position);
        
        // Use nitro if player is pulling away or on straights
        if (dist > 15 && this.nitroSystem.amount > 20) {
            this.input.keys.nitro = true;
        } else {
            this.input.keys.nitro = false;
        }
    }

    handleRecovery(delta) {
        // Recovery logic: If AI is flipped or static for long, reset orientation
        const up = new CANNON.Vec3(0, 1, 0);
        const currentUp = new CANNON.Vec3(0, 1, 0);
        this.chassisBody.quaternion.vmult(currentUp, currentUp);
        
        if (currentUp.dot(up) < 0.2 || (this.chassisBody.velocity.length() < 1 && this.input.keys.forward)) {
            // Self-right
            const rot = this.chassisBody.quaternion.toEuler();
            this.chassisBody.quaternion.setFromEuler(0, rot.y, 0);
            this.chassisBody.position.y += 0.5;
        }
    }
}
