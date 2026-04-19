import * as THREE from 'three';

export class CityGenerator {
    constructor(engine) {
        this.engine = engine;
        this.gridSize = 20;
        this.tileSize = 40; // Size of each city tile
        this.tiles = [];
        
        this.buildingMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            roughness: 0.7,
            metalness: 0.3
        });
        
        this.init();
    }

    init() {
        this.generateLayout();
        this.createInstancedBuildings();
        this.createRoads();
    }

    generateLayout() {
        // Create a 2D map of the city
        // Zones: 0-6: Highway, 7-14: Downtown, 15-19: Industrial
        for (let x = 0; x < this.gridSize; x++) {
            this.tiles[x] = [];
            for (let z = 0; z < this.gridSize; z++) {
                let zone = 'downtown';
                if (x < 5 || x > 15 || z < 5 || z > 15) zone = 'highway';
                else if (x > 8 && x < 12 && z > 8 && z < 12) zone = 'industrial';

                this.tiles[x][z] = {
                    zone: zone,
                    hasBuilding: Math.random() > 0.3,
                    height: zone === 'downtown' ? 10 + Math.random() * 30 : (zone === 'industrial' ? 5 : 2)
                };
            }
        }
    }

    createInstancedBuildings() {
        // Use InstancedMesh for thousands of buildings
        const count = this.gridSize * this.gridSize;
        const mesh = new THREE.InstancedMesh(
            new THREE.BoxGeometry(1, 1, 1),
            this.buildingMaterial,
            count
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let idx = 0;

        for (let x = 0; x < this.gridSize; x++) {
            for (let z = 0; z < this.gridSize; z++) {
                const tile = this.tiles[x][z];
                if (tile.hasBuilding) {
                    const w = this.tileSize * 0.6;
                    const h = tile.height;
                    const d = this.tileSize * 0.6;

                    dummy.position.set(
                        (x - this.gridSize / 2) * this.tileSize,
                        h / 2,
                        (z - this.gridSize / 2) * this.tileSize
                    );
                    dummy.scale.set(w, h, d);
                    dummy.updateMatrix();
                    mesh.setMatrixAt(idx++, dummy.matrix);
                }
            }
        }

        this.engine.scene.add(mesh);
    }

    createRoads() {
        // Create a large ground plane with a road texture/material logic
        const roadGeom = new THREE.PlaneGeometry(this.gridSize * this.tileSize, this.gridSize * this.tileSize);
        const roadMat = new THREE.MeshStandardMaterial({ 
            color: 0x111111,
            roughness: 0.9
        });
        const ground = new THREE.Mesh(roadGeom, roadMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.engine.scene.add(ground);

        // Grid/Road markings (Procedural)
        const grid = new THREE.GridHelper(this.gridSize * this.tileSize, this.gridSize, 0xffffff, 0x333333);
        grid.position.y = 0.05;
        this.engine.scene.add(grid);
    }
}
