import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { NitroSystem } from '../systems/NitroSystem.js';

export class Car {
    constructor(engine, input) {
        this.engine = engine;
        this.input = input;

        this.initPhysics();
        this.initVisuals();
        this.nitroSystem = new NitroSystem(this);
        
        // Upgrade Stats
        this.stats = {
            engineForce: 4500, // Boosted for punchy acceleration
            friction: 2.2,     // High base grip for snappy control
            nitroImpulse: 8000
        };

        this.applyUpgrades();
    }

    initPhysics() {
        // Car Body
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        this.chassisBody = new CANNON.Body({ mass: 1200 }); // Lower mass for agility
        this.chassisBody.addShape(chassisShape, new CANNON.Vec3(0, -0.8, 0)); // LOWER COM (Zero roll)
        this.chassisBody.position.set(0, 1, 0); 
        this.chassisBody.angularVelocity.set(0, 0, 0);

        // Raycast Vehicle
        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexForwardAxis: 2,
            indexRightAxis: 0,
            indexUpAxis: 1
        });

        const wheelOptions = {
            radius: 0.4,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 100, // Stiffer for track feel
            suspensionRestLength: 0.2,
            frictionSlip: 2.2,
            dampingRelaxation: 4.3,
            dampingCompression: 8.4,
            maxSuspensionForce: 500000,
            rollInfluence: 0.0, // Eliminate roll
            axleLocal: new CANNON.Vec3(1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3()
        };

        // Add 4 wheels
        const wheelOffsets = [
            new CANNON.Vec3(-1, 0, 1.5),  // Front Left
            new CANNON.Vec3(1, 0, 1.5),   // Front Right
            new CANNON.Vec3(-1, 0, -1.5), // Rear Left
            new CANNON.Vec3(1, 0, -1.5)   // Rear Right
        ];

        wheelOffsets.forEach(offset => {
            wheelOptions.chassisConnectionPointLocal.copy(offset);
            this.vehicle.addWheel(wheelOptions);
        });

        this.vehicle.addToWorld(this.engine.physicsWorld);

        // Collision Listener
        this.chassisBody.addEventListener('collide', (e) => {
            const mag = e.contact.getImpactVelocityAlongNormal();
            if (this.engine.cameraSystem) {
                this.engine.cameraSystem.applyShake(mag);
            }
        });

        // Wheel bodies (visual representation sync)
        this.wheelBodies = [];
        this.vehicle.wheelInfos.forEach(() => {
            const cylinderShape = new CANNON.Cylinder(0.4, 0.4, 0.4, 20);
            const wheelBody = new CANNON.Body({ mass: 1 });
            wheelBody.type = CANNON.Body.KINEMATIC;
            wheelBody.collisionFilterGroup = 0; // Don't collide physics-wise
            const q = new CANNON.Quaternion();
            q.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 2);
            wheelBody.addShape(cylinderShape, new CANNON.Vec3(), q);
            this.wheelBodies.push(wheelBody);
        });
    }

    initVisuals() {
        // Simple but slick chassis mesh
        const geometry = new THREE.BoxGeometry(2, 1, 4);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xff3e3e, 
            metalness: 0.8, 
            roughness: 0.2 
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.engine.scene.add(this.mesh);

        // Wheel meshes
        this.wheelMeshes = [];
        const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 32);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        for (let i = 0; i < 4; i++) {
            const wheelMesh = new THREE.Mesh(wheelGeom, wheelMat);
            // Pre-rotate GEOMETRY not mesh, so axis aligns with Cannon transform
            wheelMesh.geometry.rotateZ(Math.PI / 2);
            this.engine.scene.add(wheelMesh);
            this.wheelMeshes.push(wheelMesh);
        }

        // Tire Smoke System (Limited Particles)
        this.smokeParticles = [];
        const smokeGeom = new THREE.SphereGeometry(0.2, 4, 4);
        const smokeMat = new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.5 });
        for (let i = 0; i < 20; i++) {
            const p = new THREE.Mesh(smokeGeom, smokeMat);
            p.visible = false;
            this.engine.scene.add(p);
            this.smokeParticles.push({ mesh: p, life: 0 });
        }
        this.smokeIdx = 0;
    }

    applyUpgrades() {
        const upgrades = this.engine.blacklistManager.playerState.upgrades || {};
        const speedLevel = upgrades.speed || 0;
        const handlingLevel = upgrades.handling || 0;
        const nitroLevel = upgrades.nitro || 0;

        this.stats.engineForce = 2500 + speedLevel * 500;
        this.stats.friction = 1.4 + handlingLevel * 0.2;
        this.nitroSystem.nitroImpulse = 5000 + nitroLevel * 1000;
        
        console.log("Upgrades Applied", this.stats);
    }

    update(delta) {
        // Nitro System Update
        this.nitroSystem.update(delta, this.input);

        // Arcade Control Forces
        const speedKmh = Math.abs(this.chassisBody.velocity.length() * 3.6);
        
        // 1. Dynamic Steering Curve (Snappy at all speeds)
        const steerReduction = Math.max(0.4, 1 - (speedKmh / 250)); 
        const maxSteerVal = 0.6 * steerReduction;
        
        // 2. Artificial Downforce
        // Helps the car stay glued to the road at high speeds
        const downforce = speedKmh * 50; 
        this.chassisBody.applyForce(new CANNON.Vec3(0, -downforce, 0), this.chassisBody.position);

        const engineForce = this.stats.engineForce;
        const brakeForce = 150;

        const forward = this.input.keys.forward ? -engineForce : (this.input.keys.backward ? engineForce : 0);
        const steer = this.input.keys.left ? maxSteerVal : (this.input.keys.right ? -maxSteerVal : 0);
        
        // 3. Handbrake Drift
        // Reduce friction on rear wheels when space is held
        const isDrifting = this.input.keys.brake;
        const driftFriction = 0.5;
        const normalFriction = this.stats.friction;

        this.vehicle.wheelInfos[2].frictionSlip = isDrifting ? driftFriction : normalFriction;
        this.vehicle.wheelInfos[3].frictionSlip = isDrifting ? driftFriction : normalFriction;

        // Smoke Emission
        if (isDrifting && speedKmh > 20) {
            this.emitSmoke();
        }
        this.updateSmoke(delta);

        // Apply forces
        this.vehicle.applyEngineForce(forward, 2);
        this.vehicle.applyEngineForce(forward, 3);
        
        this.vehicle.setSteeringValue(steer, 0);
        this.vehicle.setSteeringValue(steer, 1);

        const brake = this.input.keys.brake ? brakeForce : 0;
        this.vehicle.setBrake(brake, 0);
        this.vehicle.setBrake(brake, 1);
        this.vehicle.setBrake(brake, 2);
        this.vehicle.setBrake(brake, 3);

        // Sync visual meshes with physics
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);

        for (let i = 0; i < this.vehicle.wheelInfos.length; i++) {
            this.vehicle.updateWheelTransform(i);
            const t = this.vehicle.wheelInfos[i].worldTransform;
            this.wheelMeshes[i].position.copy(t.position);
            this.wheelMeshes[i].quaternion.copy(t.quaternion);
        }

        // Camera follow (Now handled by CameraSystem)
        // document.getElementById('speed').innerText = Math.floor(speedKmh);
    }

    emitSmoke() {
        const p = this.smokeParticles[this.smokeIdx];
        p.mesh.position.copy(this.chassisBody.position);
        p.mesh.visible = true;
        p.life = 1.0;
        this.smokeIdx = (this.smokeIdx + 1) % this.smokeParticles.length;
    }

    updateSmoke(delta) {
        this.smokeParticles.forEach(p => {
            if (p.life > 0) {
                p.life -= delta * 2;
                p.mesh.scale.setScalar(p.life * 2);
                p.mesh.material.opacity = p.life * 0.5;
                if (p.life <= 0) p.mesh.visible = false;
            }
        });
    }
}
