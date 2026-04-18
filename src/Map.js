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
        return new Promise((resolve) => {
            this.loader.load('/models/map/city.glb', (gltf) => {
                const model = gltf.scene;
                this.scene.add(model);

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.receiveShadow = true;
                        child.castShadow = true;

                        // Create physics colliders for roads and ground only
                        const name = child.name.toLowerCase();
                        if (name.includes('road') || name.includes('ground') || name.includes('floor') || name.includes('asphalt')) {
                            this.createTrimesh(child);
                        } else if (name.includes('barrier') || name.includes('wall')) {
                            // Optionally add wall colliders
                            this.createTrimesh(child);
                        }
                    }
                });

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
