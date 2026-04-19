import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PostProcessing } from './PostProcessing.js';
import { CityGenerator } from './CityGenerator.js';
import { HeatManager } from './HeatManager.js';
import { RaceSystem } from './RaceSystem.js';
import { BlacklistManager } from './BlacklistManager.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { BlacklistUI } from '../systems/BlacklistUI.js';
import { AudioSystem } from '../systems/AudioSystem.js';

export class Engine {
    constructor() {
        this.scene = new THREE.Scene();
        this.physicsWorld = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });
        
        // Performance optimization
        this.physicsWorld.allowSleep = true;
        this.physicsWorld.defaultContactMaterial.friction = 0.5;

        this.initRenderer();
        this.initCamera();
        this.initLights();
        this.postProcessing = new PostProcessing(this);
        
        this.city = new CityGenerator(this);
        this.heatManager = new HeatManager();
        this.blacklistManager = new BlacklistManager(this);
        this.audio = new AudioSystem();
        
        this.ui = {
            blacklistUI: new BlacklistUI(this, this.blacklistManager)
        };
        
        this.policeUnits = [];
        this.rivalUnits = [];
        this.entities = [];
        
        window.addEventListener('resize', () => this.onWindowResize());
        this.clock = new THREE.Clock();
    }

    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    initCamera() {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.camera.position.set(0, 10, 20);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        sunLight.position.set(100, 200, 100);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        sunLight.shadow.camera.near = 1;
        sunLight.shadow.camera.far = 1000;
        sunLight.shadow.camera.left = -100;
        sunLight.shadow.camera.right = 100;
        sunLight.shadow.camera.top = 100;
        sunLight.shadow.camera.bottom = -100;
        this.scene.add(sunLight);

        // Hemisphere light for better sky/ground contribution
        const hemiLight = new THREE.HemisphereLight(0x8da7ff, 0x444444, 0.8);
        this.scene.add(hemiLight);
    }

    addEntity(entity) {
        this.entities.push(entity);
        if (entity.mesh) this.scene.add(entity.mesh);
        if (entity.body) this.physicsWorld.addBody(entity.body);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }

    start() {
        this.raceSystem = new RaceSystem(this, this.entities[0]); // player is first entity
        this.cameraSystem = new CameraSystem(this, this.entities[0]);
        this.renderer.setAnimationLoop(() => this.update());
    }

    update() {
        const delta = Math.min(this.clock.getDelta(), 0.1);
        
        // Step physics
        this.physicsWorld.step(1/60, delta, 3);

        // Update Heat & AI
        if (this.entities[0]) {
            this.heatManager.update(delta, this.entities[0], this.policeUnits);
            this.raceSystem.update(delta);
            this.cameraSystem.update(delta);
        }

        // Update entities (Player & Police)
        this.entities.forEach(entity => {
            if (entity.update) entity.update(delta);
        });
        
        this.policeUnits.forEach(unit => {
            if (unit.update) unit.update(delta);
        });

        this.rivalUnits.forEach(unit => {
            if (unit.update) unit.update(delta, this.entities[0]);
        });

        // Speed for Audio & Post-processing
        const speedKmh = this.entities[0] ? this.entities[0].chassisBody.velocity.length() * 3.6 : 0;
        this.audio.update(speedKmh);

        // Flash Effect logic
        if (this.postProcessing.triggerFlash) {
            this.postProcessing.triggerFlash = false;
            // Handle nitro flash visual here (e.g. simple brief brightness spike)
            this.audio.playNitro();
        }

        this.postProcessing.render(speedKmh);
    }
}
