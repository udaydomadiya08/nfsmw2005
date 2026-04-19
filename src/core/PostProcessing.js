import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

const MotionBlurShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'strength': { value: 0.0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float strength;
        varying vec2 vUv;
        void main() {
            vec4 color = vec4(0.0);
            float total = 0.0;
            for (float i = -5.0; i <= 5.0; i++) {
                float offset = i * 0.001 * strength;
                color += texture2D(tDiffuse, vUv + vec2(offset, 0.0));
                total += 1.0;
            }
            gl_FragColor = color / total;
        }
    `
};

export class PostProcessing {
    constructor(engine) {
        this.engine = engine;
        this.fpsList = [];
        this.motionBlurEnabled = true;
        this.init();
    }

    init() {
        this.composer = new EffectComposer(this.engine.renderer);
        
        const renderPass = new RenderPass(this.engine.scene, this.engine.camera);
        this.composer.addPass(renderPass);

        // Bloom for those neon/lights effects
        const bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.5, 
            0.4, 
            0.85 
        );
        this.composer.addPass(bloomPass);

        // Motion Blur Pass
        this.motionBlurPass = new ShaderPass(MotionBlurShader);
        this.composer.addPass(this.motionBlurPass);

        // Gamma correction
        const gammaPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaPass);
    }

    render(speed) {
        // FPS Guard for Motion Blur
        this.checkPerformance();
        
        if (this.motionBlurPass) {
            this.motionBlurPass.uniforms.strength.value = this.motionBlurEnabled ? Math.min(speed / 10, 2.0) : 0;
        }
        
        this.composer.render();
    }

    checkPerformance() {
        const fps = 1 / this.engine.clock.getDelta();
        this.fpsList.push(fps);
        if (this.fpsList.length > 60) {
            this.fpsList.shift();
            const avgFps = this.fpsList.reduce((a, b) => a + b, 0) / 60;
            this.motionBlurEnabled = avgFps > 30;
        }
    }

    setSize(width, height) {
        this.composer.setSize(width, height);
    }
}
