export class BlacklistUI {
    constructor(engine, blacklistManager) {
        this.engine = engine;
        this.blacklistManager = blacklistManager;
        this.isOpen = false;
        this.currentTab = 'rivals';
        
        this.init();
    }

    init() {
        const menu = document.createElement('div');
        menu.id = 'blacklist-menu';
        menu.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); backdrop-filter: blur(15px);
            display: none; flex-direction: column; align-items: center;
            padding: 50px; box-sizing: border-box; color: white;
            z-index: 1000; overflow-y: auto; font-family: 'Outfit', sans-serif;
        `;
        
        menu.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; max-width:1000px; margin-bottom:20px;">
                <h1 style="font-size:48px; font-weight:900; color:#ff3e3e; margin:0;">ALPHAVISION</h1>
                <button id="close-blacklist" style="background:none; border:2px solid #fff; color:#fff; padding:10px 20px; cursor:pointer; font-weight:900;">CLOSE</button>
            </div>
            <div style="display:flex; gap:20px; margin-bottom:30px; width:100%; max-width:1000px;">
                <button id="tab-rivals" style="background:${this.currentTab === 'rivals' ? '#ff3e3e' : '#222'}; color:white; border:none; padding:10px 30px; font-weight:900; cursor:pointer;">RIVALS</button>
                <button id="tab-shop" style="background:${this.currentTab === 'shop' ? '#ff3e3e' : '#222'}; color:white; border:none; padding:10px 30px; font-weight:900; cursor:pointer;">PERFORMANCE SHOP</button>
            </div>
            <div id="blacklist-content" style="width:100%; max-width:1000px;"></div>
        `;
        
        document.body.appendChild(menu);
        
        document.getElementById('close-blacklist').onclick = () => this.toggle();
        document.getElementById('tab-rivals').onclick = () => { this.currentTab = 'rivals'; this.render(); };
        document.getElementById('tab-shop').onclick = () => { this.currentTab = 'shop'; this.render(); };
        
        this.menu = menu;
        
        window.buyUpgrade = (type) => {
            if (this.blacklistManager.purchaseUpgrade(type)) {
                this.showDopamine(`${type.toUpperCase()} UPGRADED!`, '#00f2ff');
                this.render();
            } else {
                this.showDopamine('NOT ENOUGH BOUNTY', '#ff3e3e');
            }
        };
        const btn = document.createElement('button');
        btn.innerText = 'BLACKLIST';
        btn.id = 'blacklist-btn';
        btn.style.cssText = `
            position: absolute; top: 30px; right: 30px;
            background: rgba(255,62,62,0.8); color: white; border: none;
            padding: 10px 25px; font-weight: 900; cursor: pointer;
            pointer-events: auto; z-index: 100; box-shadow: 0 4px 15px rgba(255,62,62,0.3);
        `;
        btn.onclick = () => this.toggle();
        document.body.appendChild(btn);
    }

    toggle() {
        this.isOpen = !this.isOpen;
        this.menu.style.display = this.isOpen ? 'flex' : 'none';
        if (this.isOpen) this.render();
    }

    render() {
        // Update tab buttons
        document.getElementById('tab-rivals').style.background = this.currentTab === 'rivals' ? '#ff3e3e' : '#222';
        document.getElementById('tab-shop').style.background = this.currentTab === 'shop' ? '#ff3e3e' : '#222';

        const container = document.getElementById('blacklist-content');
        container.innerHTML = '';
        
        if (this.currentTab === 'rivals') {
            this.renderRivals(container);
        } else {
            this.renderShop(container);
        }
    }

    renderRivals(container) {
        const list = document.createElement('div');
        list.style.cssText = `display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:20px;`;
        
        this.blacklistManager.rivals.forEach(rival => {
            const isUnlocked = this.blacklistManager.canChallenge(rival.id);
            const isDefeated = this.blacklistManager.playerState.defeatedRivalIds.includes(rival.id);
            const isCurrent = this.blacklistManager.playerState.currentRank === rival.id;
            
            const card = document.createElement('div');
            card.style.cssText = `
                background: ${isDefeated ? 'rgba(0,255,0,0.1)' : (isCurrent ? 'rgba(255,62,62,0.2)' : 'rgba(255,255,255,0.05)')};
                border: 2px solid ${isDefeated ? '#00ff00' : (isCurrent ? '#ff3e3e' : '#333')};
                padding: 20px; border-radius: 8px; position: relative;
                opacity: ${isUnlocked || isDefeated ? 1 : 0.4};
            `;
            
            card.innerHTML = `
                <div style="font-size:24px; font-weight:900; color:${isDefeated ? '#00ff00' : '#fff'}">#${rival.id}</div>
                <div style="font-size:20px; font-weight:400; margin-bottom:10px;">${rival.name}</div>
                <div style="font-size:12px; color:#aaa; margin-bottom:15px;">${rival.bio}</div>
                ${isCurrent && isUnlocked ? `<button onclick="window.challengeRival(${rival.id})" style="width:100%; border:none; padding:10px; background:#ff3e3e; color:white; font-weight:900; cursor:pointer;">CHALLENGE</button>` : ''}
                ${isDefeated ? `<div style="color:#00ff00; font-weight:900; text-align:center;">DEFEATED</div>` : ''}
                ${!isUnlocked && !isDefeated ? `<div style="font-size:10px; color:#ff3e3e;">LOCKED: Need ${rival.bountyReq} Bounty</div>` : ''}
            `;
            
            list.appendChild(card);
        });
        container.appendChild(list);
    }

    renderShop(container) {
        const shop = document.createElement('div');
        shop.style.cssText = `display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:30px;`;
        
        const types = ['speed', 'handling', 'nitro'];
        types.forEach(type => {
            const level = this.blacklistManager.playerState.upgrades[type];
            const price = this.blacklistManager.upgradePrices[level] || 'MAXED';
            
            const card = document.createElement('div');
            card.style.cssText = `background:rgba(255,255,255,0.05); padding:30px; border-radius:12px; border:1px solid #333;`;
            
            card.innerHTML = `
                <h3 style="text-transform:uppercase; margin:0 0 10px 0; color:#00f2ff;">${type}</h3>
                <div style="display:flex; gap:5px; margin-bottom:20px;">
                    ${[1,2,3,4,5].map(i => `<div style="flex:1; height:8px; background:${i <= level ? '#00f2ff' : '#222'}"></div>`).join('')}
                </div>
                <div style="font-size:14px; color:#aaa; margin-bottom:20px;">
                    Current: Level ${level}<br>
                    Next Logic: ${this.getStatPreview(type, level)}
                </div>
                ${level < 5 ? `<button onclick="window.buyUpgrade('${type}')" style="width:100%; border:none; padding:15px; background:#ff3e3e; color:white; font-weight:900; cursor:pointer;">BUY: ${price} BOUNTY</button>` : '<div style="text-align:center; color:#00f2ff; font-weight:900;">MAX LEVEL</div>'}
            `;
            shop.appendChild(card);
        });
        container.appendChild(shop);
    }

    getStatPreview(type, level) {
        if (level >= 5) return "Maximum Performance reached";
        const previews = {
            speed: ["+500 Torque", "+1000 Torque", "+1500 Torque", "+2000 Torque", "+2500 Torque"],
            handling: ["+15% Grip", "+30% Grip", "+45% Grip", "+60% Grip", "+75% Grip"],
            nitro: ["+20% Boost", "+40% Boost", "+60% Boost", "+80% Boost", "+100% Boost"]
        };
        return previews[type][level];
    }

    showDopamine(text, color = '#ff3e3e') {
        const popup = document.createElement('div');
        popup.innerText = text;
        popup.style.cssText = `
            position: absolute; top: 100px; left: 50%; transform: translateX(-50%);
            background: ${color}; color: white; padding: 20px 40px;
            font-size: 32px; font-weight: 900; z-index: 2000;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5); border-radius: 4px;
            animation: popup 3s forwards;
        `;
        document.body.appendChild(popup);
        
        // Add animation keyframes if not exist
        if (!document.getElementById('popup-style')) {
            const style = document.createElement('style');
            style.id = 'popup-style';
            style.innerHTML = `
                @keyframes popup {
                    0% { transform: translate(-50%, -20px); opacity: 0; }
                    10% { transform: translate(-50%, 0); opacity: 1; }
                    80% { transform: translate(-50%, 0); opacity: 1; }
                    100% { transform: translate(-50%, 50px); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        setTimeout(() => popup.remove(), 3000);
    }
}
