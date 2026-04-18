import * as THREE from 'three';
import { PhysicsWorld } from './PhysicsWorld';
import { Input } from './Input';
import { Car } from './Car';
import { Map } from './Map';
import { CameraSystem } from './Camera';
import { AudioSystem } from './AudioSystem';
import { PursuitSystem } from './PursuitSystem';
import { StatsManager } from './StatsManager';
import { SettingsManager } from './SettingsManager';
import { SettingsUI } from './SettingsUI';
import { RaceSystem } from './RaceSystem';

class Game {
    constructor() {
        this.container = document.getElementById('container');
        this.progressBar = document.getElementById('progress-bar');
        this.loadingScreen = document.getElementById('loading-screen');
        this.startScreen = document.getElementById('start-screen');
        this.startButton = document.getElementById('start-button');
        
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true, logarithmicDepthBuffer: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        this.container.appendChild(this.renderer.domElement);

        this.physics = new PhysicsWorld();
        this.input = new Input();
        this.stats = new StatsManager();
        this.settings = new SettingsManager();
        
        this.clock = new THREE.Clock();
        this.isPaused = false;
        
        // FPS Guard
        this.fpsHistory = [];
        this.performanceThrottleActive = false;
        
        this.tips = [
            "TIP: Drifting with SPACE refills Nitro faster.",
            "TIP: High-speed collisions reset your Clean Driving bonus.",
            "TIP: Nitro impulse gives a quick kick but has a 0.8s cooldown.",
            "TIP: Launder your bounty in the Upgrade Menu for clean cash.",
            "TIP: Watch the mini-map to anticipate sharp technical turns.",
            "TIP: The Police are more aggressive at higher Heat levels."
        ];
        
        this.init();
    }

    async init() {
        // Tips rotation
        const tipEl = document.getElementById('loading-status');
        let tipIdx = 0;
        const tipInterval = setInterval(() => {
            if (tipEl) tipEl.innerText = this.tips[tipIdx % this.tips.length];
            tipIdx++;
        }, 3000);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(100, 200, 100);
        this.sunLight.castShadow = true;
        this.scene.add(this.sunLight);

        this.map = new Map(this.scene, this.physics.world);
        await this.map.load((p) => this.progressBar.style.width = `${p * 0.5}%`);

        this.physics.initVehicle();
        this.car = new Car(this.scene, this.physics.chassisBody, this.physics.vehicle.wheelInfos);
        await this.car.load();
        
        this.audio = new AudioSystem(this.camera);
        await this.audio.load();
        
        // Final UI initialization
        this.settingsUI = new SettingsUI(this.settings, this.audio, this);
        this.cameraSystem = new CameraSystem(this.camera, this.car.model);
        this.pursuit = new PursuitSystem(this.scene, this.physics.world, this.physics, this.stats);
        this.race = new RaceSystem(this.scene, this.physics, this.stats, this.audio);

        this.applySettings();
        clearInterval(tipInterval);

        setTimeout(() => {
            this.loadingScreen.style.opacity = '0';
            setTimeout(() => {
                this.loadingScreen.style.display = 'none';
                this.startScreen.style.display = 'flex';
            }, 500);
        }, 500);

        this.startButton.onclick = () => {
            window.focus();
            this.startScreen.style.display = 'none';
            this.blacklistScreen.style.display = 'none';
            this.race.start();
            this.audio.start();
            this.audio.setMasterVolume(this.settings.settings.masterVolume);
            this.animate();
        };

        window.addEventListener('resize', () => this.onResize());
    }

    applySettings() {
        const s = this.settings.settings;
        if (this.sunLight) {
            this.sunLight.castShadow = s.showShadows;
        }
        if (this.car) this.car.setGraphicsLevel(s.particleDensity);
        if (this.audio) this.audio.setMasterVolume(s.masterVolume);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.isPaused) return;

        const dt = Math.min(this.clock.getDelta(), 0.1);
        
        // FPS Monitoring
        const fps = 1 / dt;
        this.fpsHistory.push(fps);
        if (this.fpsHistory.length > 120) this.fpsHistory.shift();
        
        const avgFps = this.fpsHistory.reduce((a,b) => a+b, 0) / this.fpsHistory.length;
        if (this.fpsHistory.length >= 120 && avgFps < 25 && !this.performanceThrottleActive) {
            console.warn('FPS Guard: Low performance detected. Throttling effects.');
            this.settings.applyGraphicsPreset('low');
            this.applySettings();
            this.performanceThrottleActive = true;
        }

        // Gameplay Update
        this.physics.update(dt, this.input);
        const vel = this.physics.chassisBody.velocity;
        const speedKph = vel.length() * 3.6;

        this.car.update(dt, this.input.keys.handbrake, this.physics.isNitroActive);
        this.stats.update(dt, speedKph, this.race.state === 'RACING');

        if (this.car.model) {
            const cinematicTime = this.race.state === 'INTRO' ? this.race.timer : -1;
            this.cameraSystem.update(dt, vel, this.physics.isNitroActive, this.physics.steeringValue, cinematicTime);
        }

        if (this.pursuit) this.pursuit.update(dt);
        if (this.race) this.race.update(dt);
        
        let audioVel = vel;
        if (this.race.state === 'COUNTDOWN') audioVel = new THREE.Vector3(0,0,10);
        this.audio.update(audioVel, this.pursuit?.heat || 0, this.pursuit?.state === 'CHASING', this.physics.isNitroActive);

        this.updateUI(speedKph);
        this.renderer.render(this.scene, this.camera);
    }

    updateUI(speed) {
        document.getElementById('speed-value').innerText = Math.round(speed);
        document.getElementById('gear-indicator').innerText = Math.max(1, Math.min(6, Math.floor(speed / 50) + 1));
        const nitroBar = document.getElementById('nitro-bar');
        if (nitroBar) {
            nitroBar.style.width = `${(this.physics.nitroLevel / this.physics.nitroMax) * 100}%`;
            nitroBar.className = this.physics.isNitroActive ? 'active' : '';
        }
    }
}

window.game = new Game();
