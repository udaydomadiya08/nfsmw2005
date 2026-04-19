import { Engine } from './core/Engine.js';
import { World } from './core/World.js';
import { InputSystem } from './systems/InputSystem.js';
import { Car } from './entities/Car.js';
import { PoliceAI } from './entities/PoliceAI.js';
import { RivalAI } from './entities/RivalAI.js';
import { NPCVehicle } from './entities/NPCVehicle.js';
import * as THREE from 'three';

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

    // Spawn Traffic (50 NPC Cars)
    for (let i = 0; i < 50; i++) {
        const x = (Math.random() - 0.5) * 800;
        const z = (Math.random() - 0.5) * 800;
        const traffic = new NPCVehicle(engine, new THREE.Vector3(x, 1, z));
        engine.trafficUnits.push(traffic);
    }

    // Mission Controls
    window.addEventListener('keydown', (e) => {
        if (e.code === 'KeyM') engine.missionSystem.startMission('Speedtrap');
        if (e.code === 'KeyT') engine.missionSystem.startMission('Tollbooth');
    });

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
