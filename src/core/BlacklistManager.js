export class BlacklistManager {
    constructor(engine) {
        this.engine = engine;
        this.saveKey = 'nfsmw_rebirth_save';

        this.rivals = [
            { id: 12, name: "Sonny", bountyReq: 100, winsReq: 0, bio: "The rookie with a heavy foot.", difficulty: 1, style: "Aggressive" },
            { id: 11, name: "Taz", bountyReq: 500, winsReq: 1, bio: "Rams anyone who gets in his way.", difficulty: 1.2, style: "Rammer" },
            { id: 10, name: "Vic", bountyReq: 1500, winsReq: 2, bio: "Loves tight corners and downtown streets.", difficulty: 1.5, style: "Balanced" },
            { id: 9, name: "Earl", bountyReq: 3500, winsReq: 3, bio: "A master of the highway zones.", difficulty: 1.8, style: "Speedster" },
            { id: 8, name: "Jewels", bountyReq: 7000, winsReq: 4, bio: "Drives clean and never misses a shift.", difficulty: 2.1, style: "Clean" },
            { id: 7, name: "Kaze", bountyReq: 12000, winsReq: 5, bio: "The drift queen of the industrial zone.", difficulty: 2.5, style: "Drifter" },
            { id: 6, name: "Big Lou", bountyReq: 20000, winsReq: 6, bio: "Heavy car, heavy attitude.", difficulty: 3.0, style: "Heavy" },
            { id: 5, name: "Baron", bountyReq: 35000, winsReq: 7, bio: "Rich and fast. Don't touch his paint.", difficulty: 3.5, style: "Tactical" },
            { id: 4, name: "Joe Vega", bountyReq: 55000, winsReq: 8, bio: "The urban legend of Downtown.", difficulty: 4.2, style: "Clean" },
            { id: 3, name: "Bull", bountyReq: 85000, winsReq: 9, bio: "Unstoppable force on the loops.", difficulty: 5.1, style: "Aggressive" },
            { id: 2, name: "Ronnie", bountyReq: 130000, winsReq: 10, bio: "Almost as fast as number one.", difficulty: 6.5, style: "Speedster" },
            { id: 1, name: "Razor", bountyReq: 200000, winsReq: 12, bio: "The King. Ruthless and perfect.", difficulty: 10.0, style: "God-tier" },
        ].sort((a,b) => b.id - a.id); // Sorted 12 to 1

        this.playerState = {
            currentBounty: 0,
            totalWins: 0,
            defeatedRivalIds: [],
            currentRank: 12,
            upgrades: {
                speed: 0,
                handling: 0,
                nitro: 0
            }
        };

        this.upgradePrices = [1000, 3000, 8000, 18000, 35000];

        this.load();
    }

    save() {
        localStorage.setItem(this.saveKey, JSON.stringify(this.playerState));
    }

    load() {
        const saved = localStorage.getItem(this.saveKey);
        if (saved) {
            try {
                this.playerState = JSON.parse(saved);
                this.updateRank();
            } catch (e) {
                console.error("Failed to load save data", e);
            }
        }
    }

    addBounty(amount) {
        this.playerState.currentBounty += amount;
        this.save();
    }

    applyArrestPenalty() {
        const penalty = Math.floor(this.playerState.currentBounty * 0.15); // 15% penalty
        this.playerState.currentBounty -= penalty;
        if (this.playerState.currentBounty < 0) this.playerState.currentBounty = 0;
        this.save();
        return penalty;
    }

    onWinRace(isBossRace, rivalId) {
        this.playerState.totalWins++;
        if (isBossRace && rivalId) {
            if (!this.playerState.defeatedRivalIds.includes(rivalId)) {
                this.playerState.defeatedRivalIds.push(rivalId);
            }
        }
        this.updateRank();
        this.save();
    }

    updateRank() {
        // Current rank is the ID of the highest non-defeated rival the player has unlocked
        const nextTarget = this.rivals.slice().reverse().find(r => !this.playerState.defeatedRivalIds.includes(r.id));
        if (nextTarget) {
            this.playerState.currentRank = nextTarget.id;
        } else {
            this.playerState.currentRank = 0; // Blacklist cleared!
        }
    }

    canChallenge(rivalId) {
        const rival = this.rivals.find(r => r.id === rivalId);
        if (!rival) return false;
        
        // Already defeated?
        if (this.playerState.defeatedRivalIds.includes(rivalId)) return false;

        // Meets requirements?
        return (
            this.playerState.currentBounty >= rival.bountyReq &&
            this.playerState.totalWins >= rival.winsReq
        );
    }

    purchaseUpgrade(type) {
        const currentLevel = this.playerState.upgrades[type];
        if (currentLevel >= 5) return false;

        const price = this.upgradePrices[currentLevel];
        if (this.playerState.currentBounty >= price) {
            this.playerState.currentBounty -= price;
            this.playerState.upgrades[type]++;
            this.save();
            
            // Reapply to player car
            if (this.engine.entities[0]) {
                this.engine.entities[0].applyUpgrades();
            }
            return true;
        }
        return false;
    }
}
