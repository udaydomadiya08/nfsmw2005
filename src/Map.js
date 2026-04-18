import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as CANNON from 'cannon-es';

export class Map {
    constructor(scene, world) {
        this.scene = scene;
        this.world = world;
        this.loader = new GLTFLoader();
    }

     async load(onProgress) {
        // Create an emergency safety plane at y=0 to prevent falling into the void
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0); // Flat on ground
        groundBody.position.set(0, 0, 0);
        this.world.addBody(groundBody);
        console.log("Map: Safety plane initialized at y=0.");

        return new Promise((resolve) => {
             this.loader.load('./models/map/map.glb', (gltf) => {
                const model = gltf.scene;
                this.scene.add(model);
                
                // Flip the map right-side up and center it at the world origin
                model.rotation.x = Math.PI;
                model.position.set(-931.1, 217.3, 31.7);
                
                // CRITICAL: Ensure world matrices are up to date after shifting and rotating
                model.updateMatrixWorld(true);

                let roadCount = 0;
                let meshCount = 0;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                        child.castShadow = true;
                        meshCount++;

                        // Universal Collisions: Create colliders for all meshes with significant geometry
                        const vertexCount = child.geometry.attributes.position.count;
                        if (vertexCount > 50) {
                            this.createTrimesh(child);
                            roadCount++;
                        }
                    }
                });
                console.log(`Map: Traversed ${meshCount} meshes. Initialized ${roadCount} definitive physics colliders.`);

                resolve();
            }, (xhr) => {
                if (onProgress) {
                    const percent = (xhr.loaded / xhr.total) * 100;
                    onProgress(percent);
                }
            });
        });
    }

    createTrimesh(mesh) {
        const geometry = mesh.geometry;
        
        // Ensure geometry has attributes needed
        if (!geometry.attributes.position) return;

        const vertices = geometry.attributes.position.array;
        const indices = geometry.index ? geometry.index.array : null;

        if (!indices) return; // Need indices for trimesh generally

        const shape = new CANNON.Trimesh(vertices, indices);
        const body = new CANNON.Body({ mass: 0 }); // Static
        body.addShape(shape);
        
        // Sync position/rotation
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();
        mesh.matrixWorld.decompose(worldPos, worldQuat, worldScale);

        body.position.copy(worldPos);
        body.quaternion.copy(worldQuat);

        this.world.addBody(body);
    }
}
