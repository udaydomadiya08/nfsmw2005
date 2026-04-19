export class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        
        this.oscillators = [];
        this.isInitialized = false;
        this.isFading = false;
    }

    init() {
        if (this.isInitialized) return;
        
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0;
        this.masterGain.connect(this.ctx.destination);
        
        this.initEngineLayers();
        this.isInitialized = true;
        
        // Final fade-in
        this.masterGain.gain.setTargetAtTime(0.5, this.ctx.currentTime, 0.8);
    }

    initEngineLayers() {
        // Low Layer: Deep Rumble
        this.lowLayer = this.createLayer('sawtooth', 50, 0.4);
        // Mid Layer: Mechanical Buzz
        this.midLayer = this.createLayer('square', 100, 0.2);
        // High Layer: Brighter Peak
        this.highLayer = this.createLayer('sawtooth', 200, 0.1);
    }

    createLayer(type, freq, vol) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.value = freq;
        gain.gain.value = vol;
        
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        
        return { osc, gain, baseFreq: freq, baseVol: vol };
    }

    update(speed) {
        if (!this.isInitialized) return;
        
        const rpm = Math.min(speed / 40, 1.0); // Normalizing speed to 0-1 RPM range
        
        // Pitch blending
        const pitchScale = 1.0 + rpm * 2.5; // Up to 3.5x base frequency
        this.lowLayer.osc.frequency.setTargetAtTime(this.lowLayer.baseFreq * pitchScale, this.ctx.currentTime, 0.1);
        this.midLayer.osc.frequency.setTargetAtTime(this.midLayer.baseFreq * pitchScale, this.ctx.currentTime, 0.1);
        this.highLayer.osc.frequency.setTargetAtTime(this.highLayer.baseFreq * pitchScale, this.ctx.currentTime, 0.1);

        // Amplitude blending (High layer only kicks in at high RPM)
        this.highLayer.gain.gain.setTargetAtTime(this.highLayer.baseVol * rpm, this.ctx.currentTime, 0.1);
    }

    playNitro() {
        if (!this.isInitialized) return;
        const noiseBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < this.ctx.sampleRate * 2; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = this.ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 1000;

        const nitroGain = this.ctx.createGain();
        nitroGain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        nitroGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 2);

        whiteNoise.connect(filter);
        filter.connect(nitroGain);
        nitroGain.connect(this.masterGain);
        whiteNoise.start();
    }
}
