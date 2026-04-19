import { Engine } from './core/Engine.js';
import { World } from './core/World.js';
import { InputSystem } from './systems/InputSystem.js';
import { Car } from './entities/Car.js';
import { PoliceAI } from './entities/PoliceAI.js';
import { RivalAI } from './entities/RivalAI.js';

function bootstrap() {
    const engine = new Engine();
    const world = new World(engine);
    const input = new InputSystem();
    
    const playerCar = new Car(engine, input);
    engine.addEntity(playerCar);

    // Global start race function for the HUD
    window.startRace = () => {
        engine.audio.init();
        engine.raceSystem.startRace();
    };

    window.challengeRival = (rivalId) => {
        const rivalData = engine.blacklistManager.rivals.find(r => r.id === rivalId);
        if (!rivalData) return;

        // Spawn Rival
        const rival = new RivalAI(engine, { keys: {} }, rivalData);
        engine.rivalUnits.push(rival);
        
        // Close menu and start race
        engine.ui.blacklistUI.toggle();
        engine.raceSystem.startRace(rival);
    };

    // Police Spawning Logic based on Heat
    setInterval(() => {
        if (engine.heatManager.heatLevel > 1 && engine.policeUnits.length < engine.heatManager.heatLevel * 2) {
            const police = new PoliceAI(engine, playerCar);
            engine.policeUnits.push(police);
        }
    }, 5000);

    // Start engine loop
    engine.start();

    console.log('NFS Most Wanted Rebirth: Operational');
}

window.addEventListener('load', bootstrap);
