import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class PoliceAI {
    constructor(engine, playerCar) {
        this.engine = engine;
        this.playerCar = playerCar;
        
        this.initPhysics();
        this.initVisuals();
        
        this.maxForce = 3500;
        this.interceptDistance = 100;
    }

    initPhysics() {
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1.1, 0.55, 2.1));
        this.chassisBody = new CANNON.Body({ mass: 1800 }); // Slightly heavier than player
        this.chassisBody.addShape(chassisShape);
        
        // Spawn behind player initially
        const playerPos = this.playerCar.chassisBody.position;
        const playerForward = new CANNON.Vec3(0, 0, -1);
        this.playerCar.chassisBody.quaternion.vmult(playerForward, playerForward);
        
        this.chassisBody.position.set(
            playerPos.x - playerForward.x * 20,
            2,
            playerPos.z - playerForward.z * 20
        );
        
        this.engine.physicsWorld.addBody(this.chassisBody);
    }

    initVisuals() {
        const geometry = new THREE.BoxGeometry(2.2, 1.1, 4.2);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x111111, // Police Black
            metalness: 0.9,
            roughness: 0.1
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        
        // Siren Meshes
        const sirenGeom = new THREE.BoxGeometry(1.2, 0.2, 0.4);
        const sirenMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        this.siren = new THREE.Mesh(sirenGeom, sirenMat);
        this.siren.position.y = 0.7;
        this.mesh.add(this.siren);
        
        this.engine.scene.add(this.mesh);
        
        this.sirenTimer = 0;
    }

    update(delta) {
        const playerPos = this.playerCar.chassisBody.position;
        const myPos = this.chassisBody.position;
        
        // Path towards player
        const toPlayer = playerPos.vsub(myPos);
        const distance = toPlayer.length();
        toPlayer.normalize();
        
        // Multiplier for chase intensity
        const forceMult = distance > 10 ? 1 : (distance / 10);
        
        // Simple steering force
        const force = toPlayer.scale(this.maxForce * forceMult);
        this.chassisBody.applyForce(force, myPos);
        
        // Look at player (Rotation sync)
        if (distance > 2) {
            const angle = Math.atan2(toPlayer.x, toPlayer.z);
            this.chassisBody.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), angle + Math.PI);
        }

        // Siren Braid Effect
        this.sirenTimer += delta * 15;
        this.siren.material.color.setHex(Math.sin(this.sirenTimer) > 0 ? 0xff0000 : 0x0000ff);

        // Sync visual mesh
        this.mesh.position.copy(this.chassisBody.position);
        this.mesh.quaternion.copy(this.chassisBody.quaternion);
    }
}
