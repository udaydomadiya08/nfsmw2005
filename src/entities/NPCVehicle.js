import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class NPCVehicle {
    constructor(engine, initialPos) {
        this.engine = engine;
        
        this.initPhysics(initialPos);
        this.initVisuals();
        
        this.speed = 15 + Math.random() * 10;
        this.direction = new THREE.Vector3(
            Math.random() > 0.5 ? 1 : -1, 
            0, 
            Math.random() > 0.5 ? 1 : -1
        ).normalize();
    }

    initPhysics(pos) {
        const shape = new CANNON.Box(new CANNON.Vec3(1, 0.5, 2));
        this.body = new CANNON.Body({ mass: 1000 });
        this.body.addShape(shape);
        this.body.position.copy(pos);
        this.body.linearDamping = 0.5;
        this.engine.physicsWorld.addBody(this.body);
    }

    initVisuals() {
        const colors = [0x555555, 0xeeeeee, 0x333333, 0x4444bb];
        const geometry = new THREE.BoxGeometry(2, 1, 4);
        const material = new THREE.MeshStandardMaterial({ 
            color: colors[Math.floor(Math.random() * colors.length)],
            roughness: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.engine.scene.add(this.mesh);
    }

    update(delta) {
        // Simple forward movement
        const forward = new CANNON.Vec3(0, 0, -1);
        this.body.quaternion.vmult(forward, forward);
        forward.scale(this.speed * 100, forward);
        this.body.applyForce(forward, this.body.position);

        // Keep upright
        const rot = this.body.quaternion.toEuler();
        this.body.quaternion.setFromEuler(0, rot.y, 0);

        // Visual sync
        this.mesh.position.copy(this.body.position);
        this.mesh.quaternion.copy(this.body.quaternion);

        // Grid Bounds Check (Keep them in the city)
        const limit = 500;
        if (Math.abs(this.body.position.x) > limit || Math.abs(this.body.position.z) > limit) {
            this.body.position.set(
                (Math.random() - 0.5) * limit * 2,
                1,
                (Math.random() - 0.5) * limit * 2
            );
        }
    }
}
