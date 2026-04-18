import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';

export class PoliceAI {
    constructor(scene, world, position, role = 'CHASER') {
        this.scene = scene;
        this.world = world;
        this.role = role;
        
        this.body = null;
        this.vehicle = null;
        this.model = null;
        
        this.maxEngineForce = 3000;
        this.maxSteeringVal = 0.5;
        
        this.initPhysics(position);
        this.loadModel();
    }

    initPhysics(pos) {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1.2, 0.4, 2.5));
        this.body = new CANNON.Body({ mass: 1500 }); // Heavier than player for ramming
        this.body.addShape(chassisShape);
        this.body.position.set(pos.x, pos.y + 1, pos.z);
        
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.body,
            indexForwardAxis: 2,
            indexRightAxis: 0,
            indexUpAxis: 1,
        });

        const options = {
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 1.4,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
        };

        // Add 4 wheels
        const wheelOffsets = [
            new CANNON.Vec3(-1, 0, 1.5), new CANNON.Vec3(1, 0, 1.5),
            new CANNON.Vec3(-1, 0, -1.5), new CANNON.Vec3(1, 0, -1.5)
        ];
        wheelOffsets.forEach(offset => {
            options.chassisConnectionPointLocal.copy(offset);
            this.vehicle.addWheel(options);
        });

        this.vehicle.addToWorld(this.world);
    }

    loadModel() {
        const loader = new FBXLoader();
        loader.load('./models/police/police.fbx', (fbx) => {
            this.model = fbx;
            this.model.scale.set(0.01, 0.01, 0.01);
            this.scene.add(this.model);
            
            // Apply a "Police" look (tinting window or adding blue light placeholder)
            this.model.traverse(child => {
                if (child.isMesh) {
                    if (child.name.toLowerCase().includes('glass')) {
                        child.material.color.set(0x0000ff); // Blue glass for police feel
                    }
                }
            });
        });
    }

    update(dt, playerPos, playerVelocity) {
        if (!this.body) return;

        // Predictive Interception
        // Estimate where player will be in 1 second
        const predictionTime = 1.2;
        // playerPos and playerVelocity are CANNON.Vec3, so we must use .vadd instead of .add
        const targetPos = playerPos.vadd(playerVelocity.scale(predictionTime));

        // Steering Logic
        const localTarget = this.body.pointToLocalFrame(targetPos);
        const distance = localTarget.length();
        
        // Simple steering: turn toward local target
        let steer = Math.atan2(localTarget.x, localTarget.z);
        steer = Math.max(-this.maxSteeringVal, Math.min(this.maxSteeringVal, steer));
        
        this.vehicle.setSteeringValue(steer, 0);
        this.vehicle.setSteeringValue(steer, 1);

        // Power Logic based on Role
        let force = this.maxEngineForce;
        
        if (this.role === 'AGGRESSOR' && distance < 15) {
            force *= 1.5; // Nitro boost for ramming
        } else if (this.role === 'BLOCKER') {
            // Attempt to get ahead
            const aheadPos = playerPos.vadd(playerVelocity.scale(2.0));
            const localAhead = this.body.pointToLocalFrame(aheadPos);
            // Higher priority on getting ahead
        }

        this.vehicle.applyEngineForce(-force, 2);
        this.vehicle.applyEngineForce(-force, 3);

        // Sync visual model
        if (this.model) {
            this.model.position.copy(this.body.position);
            this.model.quaternion.copy(this.body.quaternion);
        }
    }

    destroy() {
        if (this.model) this.scene.remove(this.model);
        if (this.vehicle) this.vehicle.removeFromWorld(this.world);
    }
}
