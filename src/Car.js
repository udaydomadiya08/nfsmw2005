import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

export class Car {
    constructor(scene, physicsBody, wheelInfos) {
        this.scene = scene;
        this.physicsBody = physicsBody;
        this.wheelInfos = wheelInfos;
        this.model = null;
        this.wheels = [];
        this.loader = new FBXLoader();
        this.particleDensity = 1.0;
    }

    async load() {
        return new Promise((resolve) => {
            try {
                this.loader.load('/models/car/FINAL_MODEL_MW.fbx', (fbx) => {
                    this.model = fbx;
                    this.model.scale.set(0.01, 0.01, 0.01);
                    this.model.traverse((child) => {
                        if (child.isMesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });
                    this.scene.add(this.model);
                    resolve();
                }, null, (err) => {
                    console.error('Car: Model failed to load. Using fallback box.', err);
                    this.createFallbackModel();
                    resolve();
                });
            } catch (e) {
                this.createFallbackModel();
                resolve();
            }
        });
    }

    createFallbackModel() {
        const geo = new THREE.BoxGeometry(2.4, 0.8, 5);
        const mat = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
        this.model = new THREE.Mesh(geo, mat);
        this.scene.add(this.model);
    }

    initParticles() {
        const smokeCount = 100;
        const smokeGeo = new THREE.BufferGeometry();
        const smokePos = new Float32Array(smokeCount * 3);
        smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePos, 3));
        const smokeMat = new THREE.PointsMaterial({
            color: 0xcccccc, size: 0.3, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending
        });
        this.smokeParticles = new THREE.Points(smokeGeo, smokeMat);
        this.scene.add(this.smokeParticles);

        const nitroCount = 50;
        const nitroGeo = new THREE.BufferGeometry();
        const nitroPos = new Float32Array(nitroCount * 3);
        nitroGeo.setAttribute('position', new THREE.BufferAttribute(nitroPos, 3));
        const nitroMat = new THREE.PointsMaterial({
            color: 0x00bfff, size: 0.6, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending
        });
        this.nitroParticles = new THREE.Points(nitroGeo, nitroMat);
        this.scene.add(this.nitroParticles);
        
        this.particleData = { smoke: [], nitro: [] };
    }

    setGraphicsLevel(density) {
        this.particleDensity = density;
    }

    update(dt, isHandbrake, isNitroActive) {
        if (!this.model || !this.physicsBody) return;

        this.model.position.copy(this.physicsBody.position);
        this.model.quaternion.copy(this.physicsBody.quaternion);

        if (!this.smokeParticles) this.initParticles();

        if (isHandbrake && this.physicsBody.velocity.length() > 2) {
            if (Math.random() < this.particleDensity) this.emitParticle('smoke', this.model.position);
        }
        if (isNitroActive) {
            const exhaustPos = this.model.position.clone().add(new THREE.Vector3(0, 0, -2.5).applyQuaternion(this.model.quaternion));
            if (Math.random() < this.particleDensity) this.emitParticle('nitro', exhaustPos);
        }

        this.updateParticleSystem('smoke', dt);
        this.updateParticleSystem('nitro', dt);
    }

    emitParticle(type, pos) {
        const p = {
            position: pos.clone().add(new THREE.Vector3((Math.random()-0.5)*1.5, 0, (Math.random()-0.5)*1.5)),
            velocity: new THREE.Vector3((Math.random()-0.5), Math.random()*1.5, (Math.random()-0.5)),
            life: 1.0
        };
        this.particleData[type].push(p);
        if (this.particleData[type].length > (type === 'smoke' ? 100 : 50)) this.particleData[type].shift();
    }

    updateParticleSystem(type, dt) {
        const sys = type === 'smoke' ? this.smokeParticles : this.nitroParticles;
        const positions = sys.geometry.attributes.position.array;
        
        this.particleData[type].forEach((p, i) => {
            p.life -= dt;
            p.position.add(p.velocity.clone().multiplyScalar(dt));
            if (i < sys.geometry.attributes.position.count) {
                positions[i*3] = p.position.x;
                positions[i*3+1] = p.position.y;
                positions[i*3+2] = p.position.z;
            }
        });
        sys.geometry.attributes.position.needsUpdate = true;
        sys.material.opacity = Math.max(0, this.particleData[type][0]?.life || 0);
    }
}
