import * as THREE from 'three';

export class AudioSystem {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);

        // Master Gain
        this.masterGain = this.listener.context.createGain();
        this.masterGain.connect(this.listener.context.destination);
        
        this.engineSound = new THREE.Audio(this.listener);
        this.sirenSound = new THREE.Audio(this.listener);
        this.nitroSound = new THREE.Audio(this.listener);

        this.loader = new THREE.AudioLoader();
        this.isLoaded = false;
        
        this.basePitch = 0.5;
        this.maxPitch = 2.0;
    }

    async load() {
        try {
            const enginePromise = new Promise(r => this.loader.load('./sounds/engine.mp3', r, null, () => r(null)));
            const nitroPromise = new Promise(r => this.loader.load('./sounds/nitro.mp3', r, null, () => r(null)));
            
            const [engineBuffer, nitroBuffer] = await Promise.all([enginePromise, nitroPromise]);
            
            if (engineBuffer) {
                this.engineSound.setBuffer(engineBuffer);
                this.engineSound.setLoop(true);
                this.engineSound.setVolume(0.5);
                this.sirenSound.setBuffer(engineBuffer); 
                this.sirenSound.setLoop(true);
                this.sirenSound.setVolume(0);
            }

            if (nitroBuffer) {
                this.nitroSound.setBuffer(nitroBuffer);
                this.nitroSound.setLoop(true);
                this.nitroSound.setVolume(0);
            }

            this.isLoaded = true;
        } catch (e) {
            console.error('AudioSystem: Failed to load core audio. Entering silent mode.', e);
            this.isLoaded = true; // Still "loaded" but silent
        }
    }

    setMasterVolume(value) {
        if (this.listener && this.listener.context) {
            this.masterGain.gain.setTargetAtTime(value, this.listener.context.currentTime, 0.1);
        }
    }

    start() {
        if (this.isLoaded) {
            if (this.engineSound.buffer && !this.engineSound.isPlaying) this.engineSound.play();
            if (this.sirenSound.buffer && !this.sirenSound.isPlaying) this.sirenSound.play();
            if (this.nitroSound.buffer && !this.nitroSound.isPlaying) this.nitroSound.play();
        }
    }

    update(velocity, heat = 0, isChasing = false, isNitroActive = false) {
        if (!this.isLoaded || !this.engineSound.buffer) return;

        const speedKph = velocity.length() * 3.6;
        
        // Engine Pitch
        let targetPitch = this.basePitch + (speedKph / 300) * (this.maxPitch - this.basePitch);
        if (isNitroActive) targetPitch *= 1.2; 
        
        if (this.engineSound.source) {
            const currentPitch = this.engineSound.source.playbackRate.value;
            this.engineSound.source.playbackRate.value = THREE.MathUtils.lerp(currentPitch, targetPitch, 0.1);
            this.engineSound.setVolume(0.3 + (speedKph / 300) * 0.4);
        }

        // Nitro Hiss
        if (this.nitroSound.buffer) {
            if (isNitroActive) {
                this.nitroSound.setVolume(THREE.MathUtils.lerp(this.nitroSound.getVolume(), 0.8, 0.2));
            } else {
                this.nitroSound.setVolume(THREE.MathUtils.lerp(this.nitroSound.getVolume(), 0, 0.2));
            }
        }

        // Siren Modulation
        if (this.sirenSound.buffer) {
            if (isChasing) {
                const sirenVol = Math.min(0.8, 0.2 + (heat / 5) * 0.6);
                this.sirenSound.setVolume(THREE.MathUtils.lerp(this.sirenSound.getVolume(), sirenVol, 0.05));
                if (this.sirenSound.source) {
                    this.sirenSound.source.playbackRate.value = 2.0 + Math.sin(Date.now() * 0.005) * 0.5;
                }
            } else {
                this.sirenSound.setVolume(THREE.MathUtils.lerp(this.sirenSound.getVolume(), 0, 0.05));
            }
        }
    }

    playCountdownBeep(isGo = false) {
        if (!this.isLoaded || !this.nitroSound.buffer) return;
        const beep = new THREE.Audio(this.listener);
        beep.setBuffer(this.nitroSound.buffer); 
        beep.setVolume(0.4);
        if (beep.source) beep.source.playbackRate.value = isGo ? 3.0 : 1.5;
        beep.play();
    }
}
