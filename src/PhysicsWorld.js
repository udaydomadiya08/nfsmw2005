import * as CANNON from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.defaultContactMaterial.friction = 0.4;

        this.vehicle = null;
        this.chassisBody = null;
        this.wheelBodies = [];
        
        // Acceleration Curve Parameters
        this.maxEngineForce = 3500;
        this.driftFriction = 0.1;
        this.normalFriction = 1.0;

        this.steeringValue = 0;
        
        // Nitro System
        this.nitroLevel = 100;
        this.nitroMax = 100;
        this.isNitroActive = false;
        this.nitroPower = 1.8; // Boost multiplier
        this.nitroBurnRate = 25; // per second
        this.nitroRefillRate = 5; // per second

        // Nitro Polish (Revised)
        this.nitroCooldown = 0.8;
        this.nitroCooldownTimer = 0;
        this.lastNitroState = false;
        this.nitroImpulseForce = 8000;
    }

    initVehicle() {
        // Chassis shape
        const chassisShape = new CANNON.Box(new CANNON.Vec3(1.2, 0.4, 2.5));
        this.chassisBody = new CANNON.Body({ mass: 1200 });
        this.chassisBody.addShape(chassisShape);
        this.chassisBody.position.set(0, 15, 0);
        this.chassisBody.angularDamping = 0.5;

        this.vehicle = new CANNON.RaycastVehicle({
            chassisBody: this.chassisBody,
            indexForwardAxis: 2,
            indexRightAxis: 0,
            indexUpAxis: 1,
        });

        // Wheel options
        const options = {
            radius: 0.35,
            directionLocal: new CANNON.Vec3(0, -1, 0),
            suspensionStiffness: 30,
            suspensionRestLength: 0.3,
            frictionSlip: 1.4,
            dampingRelaxation: 2.3,
            dampingCompression: 4.4,
            maxSuspensionForce: 100000,
            rollResistance: 0.01,
            axleLocal: new CANNON.Vec3(-1, 0, 0),
            chassisConnectionPointLocal: new CANNON.Vec3(1, 1, 0),
            maxSuspensionTravel: 0.3,
            customSlidingRotationalSpeed: -30,
            useCustomSlidingRotationalSpeed: true,
        };

        // Wheels setup... (identical to previous)
        options.chassisConnectionPointLocal.set(-1, 0, 1.5);
        this.vehicle.addWheel(options);
        options.chassisConnectionPointLocal.set(1, 0, 1.5);
        this.vehicle.addWheel(options);
        options.chassisConnectionPointLocal.set(-1, 0, -1.5);
        this.vehicle.addWheel(options);
        options.chassisConnectionPointLocal.set(1, 0, -1.5);
        this.vehicle.addWheel(options);

        this.vehicle.addToWorld(this.world);

        this.chassisBody.addEventListener('collide', (e) => {
            const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
            if (relativeVelocity > 5 && this.onCollision) {
                this.onCollision(relativeVelocity * 0.05, relativeVelocity);
            }
        });
    }

    setOnCollisionCallback(cb) {
        this.onCollision = cb;
    }

    update(dt, input) {
        this.world.step(1/60, dt, 10);
        
        if (!this.vehicle) return;

        const velocityVec = this.chassisBody.velocity;
        const velocity = velocityVec.length();
        const speedKph = velocity * 3.6;

        // Steering Logic
        const steeringMax = 0.5;
        const steeringSpeedFactor = Math.max(0.2, 1 - (speedKph / 250));
        this.steeringValue = 0;
        if (input.keys.left) this.steeringValue = steeringMax * steeringSpeedFactor;
        if (input.keys.right) this.steeringValue = -steeringMax * steeringSpeedFactor;
        this.vehicle.setSteeringValue(this.steeringValue, 0);
        this.vehicle.setSteeringValue(this.steeringValue, 1);

        // Nitro Logic
        this.nitroCooldownTimer = Math.max(0, this.nitroCooldownTimer - dt);
        const nitroRequest = input.keys.nitro && this.nitroLevel > 5;
        
        // Single trigger impulse with cooldown
        if (nitroRequest && !this.lastNitroState && this.nitroCooldownTimer === 0) {
            this.applyNitroImpulse(speedKph);
            this.nitroCooldownTimer = this.nitroCooldown;
        }
        this.lastNitroState = nitroRequest;

        this.isNitroActive = nitroRequest;
        if (this.isNitroActive) {
            this.nitroLevel = Math.max(0, this.nitroLevel - this.nitroBurnRate * dt);
        } else {
            this.nitroLevel = Math.min(this.nitroMax, this.nitroLevel + this.nitroRefillRate * dt);
        }

        // Engine Force
        let engineForce = 0;
        const topSpeed = this.isNitroActive ? 400 : 320;
        const torqueCurve = Math.max(0.1, 1 - (speedKph / topSpeed));
        
        if (input.keys.forward) {
            engineForce = -this.maxEngineForce * torqueCurve;
            if (this.isNitroActive) {
                const nitroMultiplier = this.nitroPower * (1 + (1 - speedKph / topSpeed) * 0.5);
                engineForce *= nitroMultiplier;
            }
        } else if (input.keys.backward) {
            engineForce = this.maxEngineForce * 0.5;
        }

        this.vehicle.applyEngineForce(engineForce, 2);
        this.vehicle.applyEngineForce(engineForce, 3);

        // Braking / Handbrake
        let brakeForce = 0;
        if (input.keys.handbrake) {
            brakeForce = this.maxBrakeForce;
            this.vehicle.wheelInfos[2].frictionSlip = this.driftFriction;
            this.vehicle.wheelInfos[3].frictionSlip = this.driftFriction;
        } else {
            this.vehicle.wheelInfos[2].frictionSlip = this.normalFriction;
            this.vehicle.wheelInfos[3].frictionSlip = this.normalFriction;
            if (input.keys.backward && velocity > 1) {
                brakeForce = this.maxBrakeForce * 0.5;
            }
        }
        this.vehicle.setBrake(brakeForce, 0);
        this.vehicle.setBrake(brakeForce, 1);
        this.vehicle.setBrake(brakeForce, 2);
        this.vehicle.setBrake(brakeForce, 3);

        // Downforce
        const downforce = velocity * 2.0;
        this.chassisBody.applyLocalForce(new CANNON.Vec3(0, -downforce, 0), new CANNON.Vec3(0,0,0));
    }

    applyNitroImpulse(speedKph) {
        // Reduced effect at very high speeds
        const damping = Math.max(0.2, 1 - (speedKph / 350));
        const impulse = this.nitroImpulseForce * damping;
        
        // Apply local impulse in forward direction (z)
        const worldImpulse = new CANNON.Vec3(0, 0, -impulse);
        this.chassisBody.applyLocalImpulse(worldImpulse, new CANNON.Vec3(0, 0, 0));
    }
}
