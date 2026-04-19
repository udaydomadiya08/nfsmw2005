export class InputHandler {
    constructor() {
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            brake: false,
            nitro: false
        };

        window.addEventListener('keydown', (e) => this.updateKey(e.code, true));
        window.addEventListener('keyup', (e) => this.updateKey(e.code, false));
    }

    updateKey(code, state) {
        switch(code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = state;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.backward = state;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = state;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = state;
                break;
            case 'Space':
                this.keys.brake = state;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.nitro = state;
                break;
        }
    }
}
