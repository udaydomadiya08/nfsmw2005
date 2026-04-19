import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader.js';

const ColorCorrectionShader = {
    uniforms: {
        'tDiffuse': { value: null },
        'exposure': { value: 1.0 },
        'contrast': { value: 1.2 },
        'saturation': { value: 1.1 },
        'tint': { value: new THREE.Color(1.1, 1.0, 0.8) } // MW2005 Warm/Orange Tint
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
        uniform float exposure;
        uniform float contrast;
        uniform float saturation;
        uniform vec3 tint;
        varying vec2 vUv;
        void main() {
            vec4 tex = texture2D(tDiffuse, vUv);
            vec3 color = tex.rgb * exposure;
            color = (color - 0.5) * contrast + 0.5;
            float luma = dot(color, vec3(0.299, 0.587, 0.114));
            color = mix(vec3(luma), color, saturation);
            color *= tint;
            gl_FragColor = vec4(color, tex.a);
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

        // Color Correction & Tint (Pure Clarity)
        this.colorPass = new ShaderPass(ColorCorrectionShader);
        this.composer.addPass(this.colorPass);

        // Gamma correction
        const gammaPass = new ShaderPass(GammaCorrectionShader);
        this.composer.addPass(gammaPass);
    }

    render(speed) {
        // FPS Guard - Keep it for other heavy passes
        this.checkPerformance();
        
        // Dynamic Exposure based on speed (simulating wind/tunnel vision)
        if (this.colorPass) {
            this.colorPass.uniforms.exposure.value = 1.0 + (speed / 200);
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
