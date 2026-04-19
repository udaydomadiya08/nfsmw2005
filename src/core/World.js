import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class World {
    constructor(engine) {
        this.engine = engine;
        this.initEnvironment();
        this.initGround();
    }

    initEnvironment() {
        // Dark, premium skybox/background
        this.engine.scene.background = new THREE.Color(0x0a0a0c);
        this.engine.scene.fog = new THREE.FogExp2(0x0a0a0c, 0.005);
    }

    initGround() {
        // Physics for ground
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.engine.physicsWorld.addBody(groundBody);

        // Visual for ground - Grid style for that premium dev look
        const size = 2000;
        const divisions = 200;
        
        const gridHelper = new THREE.GridHelper(size, divisions, 0xff3e3e, 0x222222);
        gridHelper.position.y = 0.05;
        this.engine.scene.add(gridHelper);

        // Ground Mesh (Subtle floor)
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        this.engine.scene.add(mesh);
    }
}
