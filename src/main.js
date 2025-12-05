// game.js
window.addEventListener('load', function () {
    const config = {
        type: Phaser.AUTO,
        width: window.innerWidth,
        height: window.innerHeight,
        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: 2000 },
                debug: false
            }
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };

    const game = new Phaser.Game(config);

    let player;
    let cursors;
    let wasd;

    let groundBlocks = [];
    let stoneBlocks = [];
    let spikeBlocks = [];
    let allBlocks = [];
    let platforms = [];
    let enemies = [];

    let checkpoints = [];
    let lastCheckpoint = null;

    let sightGraphics;

    const JUMP_STRENGTH = -1000;
    const PLAYER_SPEED = 900;
    const ENEMY_PATROL_SPEED = 150;
    const ENEMY_CHASE_MULT = 1.5;
    const ENEMY_SIZE = 50;
    const CHECKPOINT_SIZE = 32;

    let grassScale, grassScaledWidth, grassScaledHeight;
    let stoneScale, stoneW, stoneH, blockWidth, blockHeight;

    // ---------------------------------------------------------
    // PRELOAD
    // ---------------------------------------------------------
    function preload() {
        this.load.image('grass', 'assets/Grass.png');
        this.load.image('stone', 'assets/Stone.png');
        this.load.image('spike', 'assets/Spikes.png');

        // Player texture
        const p = this.add.graphics();
        p.fillStyle(0x00ff00, 1);
        p.fillRect(0, 0, ENEMY_SIZE, ENEMY_SIZE);
        p.generateTexture('player', ENEMY_SIZE, ENEMY_SIZE);
        p.destroy();

        // Enemy texture
        const e = this.add.graphics();
        e.fillStyle(0xff0000, 1);
        e.fillRect(0, 0, ENEMY_SIZE, ENEMY_SIZE);
        e.generateTexture('enemy', ENEMY_SIZE, ENEMY_SIZE);
        e.destroy();

        // Checkpoint textures
        const c1 = this.add.graphics();
        c1.fillStyle(0xffffff, 1);
        c1.fillRect(0, 0, CHECKPOINT_SIZE, CHECKPOINT_SIZE);
        c1.generateTexture('checkpoint_white', CHECKPOINT_SIZE, CHECKPOINT_SIZE);
        c1.destroy();

        const c2 = this.add.graphics();
        c2.fillStyle(0x0000ff, 1);
        c2.fillRect(0, 0, CHECKPOINT_SIZE, CHECKPOINT_SIZE);
        c2.generateTexture('checkpoint_blue', CHECKPOINT_SIZE, CHECKPOINT_SIZE);
        c2.destroy();
    }

    // ---------------------------------------------------------
    // CREATE
    // ---------------------------------------------------------
    function create() {
        const groundY = window.innerHeight - 32;

        this.cameras.main.setBounds(0, 0, 25000, window.innerHeight);
        this.physics.world.setBounds(0, 0, 25000, window.innerHeight);

        // scale grass
        grassScale = 0.0625;
        const grassTexture = this.textures.get('grass');
        grassScaledWidth = grassTexture.getSourceImage().width * grassScale;
        grassScaledHeight = grassTexture.getSourceImage().height * grassScale;

        // scale stone
        const stoneTexture = this.textures.get('stone');
        blockWidth = stoneTexture.getSourceImage().width;
        blockHeight = stoneTexture.getSourceImage().height;
        stoneScale = 0.0625;
        stoneW = blockWidth * stoneScale;
        stoneH = blockHeight * stoneScale;

        // ---------------- GROUND ----------------
        for (let x = 0; x < 25000; x += grassScaledWidth) {
            const block = this.physics.add.image(x, groundY, 'grass')
                .setScale(grassScale)
                .setOrigin(0.5, 0.5);

            block.setImmovable(true);
            block.body.setAllowGravity(false);
            groundBlocks.push(block);
            allBlocks.push(block);
        }

        // ---------------- PLAYER ----------------
        const playerX = 100;
        const playerY = groundY - (grassScaledHeight / 2) - (ENEMY_SIZE / 2) - 20;

        player = this.physics.add.sprite(playerX, playerY, 'player');
        player.setCollideWorldBounds(true);
        player.isFastFalling = false;

        this.cameras.main.startFollow(player, true, 0.1, 0.1);
        this.cameras.main.setLerp(0.15, 0.15);
        this.cameras.main.setDeadzone(window.innerWidth * 0.25, window.innerHeight * 0.5);

        groundBlocks.forEach(b => this.physics.add.collider(player, b));

        // ---------------- PLATFORMS ----------------
        const stoneObjects = [
            { x: 64 * 10 - 32, y: groundY - 200, width: 1 },
            { x: 64 * 15 - 32, y: groundY - 300, width: 1 },
            { x: 64 * 21 - 32, y: groundY - 250, width: 1 },
            { x: 64 * 29 - 32, y: groundY - 250, width: 4 },
            { x: 64 * 40 - 32, y: groundY - 300, width: 5 },
            { x: 64 * 52 - 32, y: groundY - 200, width: 3 },
            { x: 64 * 63 - 32, y: groundY - 350, width: 4 },
            { x: 64 * 74 - 32, y: groundY - 450, width: 4 },
            { x: 64 * 85 - 32, y: groundY - 300, width: 3 },
            { x: 64 * 94 - 32, y: groundY - 250, width: 4 },
            { x: 64 * 106 - 32, y: groundY - 200, width: 3 },
            { x: 64 * 113 - 32, y: groundY - 150, width: 2 },
            { x: 64 * 119 - 32, y: groundY - 100, width: 3 },
            { x: 64 * 126 - 32, y: groundY - 200, width: 2 },
            { x: 64 * 135 - 32, y: groundY - 280, width: 2 }
        ];

        stoneObjects.forEach(obj => {
            let plat = [];
            for (let i = 0; i < obj.width; i++) {
                const cx = obj.x + i * stoneW - stoneW / 2;
                const cy = obj.y - stoneH / 2;

                const s = this.physics.add.image(cx, cy, 'stone')
                    .setScale(stoneScale)
                    .setOrigin(0.5);

                s.setImmovable(true);
                s.body.setAllowGravity(false);

                this.physics.add.collider(player, s);

                stoneBlocks.push(s);
                plat.push(s);
                allBlocks.push(s);
            }
            platforms.push(plat);
        });

        // ---------------- TOP SPIKES ----------------
        const spikePositions = [
            { x: 64 * 29 - 32, y: groundY - 250 },
            { x: 64 * 40 - 32, y: groundY - 300 },
            { x: 64 * 63 - 32, y: groundY - 350 }
        ];

        spikePositions.forEach(pos => {
            const cx = pos.x - stoneH / 2;
            const cy = pos.y - stoneH * 1.5;

            const sp = this.physics.add.image(cx, cy, 'spike').setOrigin(0.5);
            sp.setDisplaySize(stoneW, stoneH);
            sp.setImmovable(true);
            sp.body.setAllowGravity(false);
            sp.setDepth(1);

            this.physics.add.collider(player, sp, respawnPlayer);

            spikeBlocks.push(sp);
            allBlocks.push(sp);
        });

        // ---------------- BOTTOM SPIKE LINE ----------------
        const spWidth = blockWidth * grassScale;
        const minX = Math.min(...stoneObjects.map(o => o.x));
        const maxX = Math.max(...stoneObjects.map(o => o.x + (o.width ? o.width * stoneW : 0)));
        const spikeY = groundY - (grassScaledHeight / 2) - (spWidth / 2);

        for (let x = minX; x <= maxX; x += spWidth) {
            const sp = this.physics.add.image(x - spWidth / 2, spikeY, 'spike').setOrigin(0.5);
            sp.setDisplaySize(spWidth, spWidth);
            sp.setImmovable(true);
            sp.body.setAllowGravity(false);
            sp.setDepth(1);

            this.physics.add.collider(player, sp, respawnPlayer);

            spikeBlocks.push(sp);
            allBlocks.push(sp);
        }

        // ---------------- CONTROLS ----------------
        cursors = this.input.keyboard.createCursorKeys();
        wasd = this.input.keyboard.addKeys('W,S,A,D');

        // ---------------- enemy sight graphics ----------------
        sightGraphics = this.add.graphics().setDepth(1000);

        // ---------------- ENEMY SPAWN ----------------
        const enemyPlatformIndices = [];

        spikePositions.forEach(() => { });

        for (let p = 0; p < platforms.length; p++) {
            const plat = platforms[p];
            if (plat.length < 3) continue;

            let hasSpike = false;

            for (const spikePos of spikePositions) {
                for (const block of plat) {
                    const sx = spikePos.x - stoneH / 2;
                    if (Math.abs(sx - block.x) < stoneW / 2 + 1) {
                        hasSpike = true;
                        break;
                    }
                }
                if (hasSpike) break;
            }

            if (!hasSpike) enemyPlatformIndices.push(p);
        }

        enemyPlatformIndices.forEach(idx => {
            const plat = platforms[idx];
            if (plat.length === 0) return;

            const base = plat[0];
            const ex = base.x;
            const ey = base.y - 64;

            const enemy = this.physics.add.sprite(ex, ey, 'enemy');
            enemy.setCollideWorldBounds(true);

            enemy.state = 'patrol';
            enemy.direction = Math.random() < 0.5 ? -1 : 1;
            enemy.initialDirection = enemy.direction;

            enemy.spawnX = ex;
            enemy.spawnY = ey;

            enemy.setVelocityX(enemy.direction * ENEMY_PATROL_SPEED);

            this.physics.add.collider(player, enemy, playerHitEnemy);
            stoneBlocks.forEach(s => this.physics.add.collider(enemy, s));
            groundBlocks.forEach(g => this.physics.add.collider(enemy, g));
            spikeBlocks.forEach(sp => this.physics.add.collider(enemy, sp, () => killEnemy(enemy)));

            enemies.push(enemy);
        });

        // ---------------------------------------------------------
        // CHECKPOINTS
        // ---------------------------------------------------------
        const checkpointPositions = [
            { x: 64 * 21 - 64, y: groundY - 350 },
            { x: 64 * 66 - 64, y: groundY - 450 },
            { x: 64 * 135 - 64, y: groundY - 380 }
        ];

        const saved = localStorage.getItem('lastCheckpoint');
        lastCheckpoint = saved ? JSON.parse(saved) : null;

        checkpointPositions.forEach(pos => {
            const cp = this.physics.add.sprite(pos.x, pos.y, 'checkpoint_white');

            cp.reached = false;
            cp.setDisplaySize(CHECKPOINT_SIZE, CHECKPOINT_SIZE);
            cp.body.setAllowGravity(false);
            cp.setImmovable(true);

            cp.setAngle(45);

            // restore active checkpoint
            if (lastCheckpoint &&
                Math.abs(cp.x - lastCheckpoint.x) < 1 &&
                Math.abs(cp.y - lastCheckpoint.y) < 1) {
                cp.reached = true;
                cp.setTexture('checkpoint_blue');
                lastCheckpoint = cp;
            }

            this.physics.add.overlap(player, cp, () => {
                if (!cp.reached) {

                    // deactivate all others
                    checkpoints.forEach(o => {
                        if (o !== cp) {
                            o.reached = false;
                            o.setTexture('checkpoint_white');
                        }
                    });

                    // activate this checkpoint
                    cp.reached = true;
                    cp.setTexture('checkpoint_blue');
                    lastCheckpoint = cp;

                    localStorage.setItem('lastCheckpoint', JSON.stringify({
                        x: cp.x,
                        y: cp.y
                    }));
                }
            });

            checkpoints.push(cp);
        });

        // ---------------------------------------------------------
        // CANVAS RESET BUTTON (ROUNDED RECTANGLE)
        //
        // Replaced the previous graphics-in-container approach with
        // a proper interactive rectangle and separate text so both
        // the rectangle and the text respond reliably to clicks.
        // ---------------------------------------------------------

        const btnX = 20;
        const btnY = 20;
        const btnW = 260;
        const btnH = 70;
        const btnRadius = 20;

        // background rounded rectangle (visual) - use graphics but not for interaction
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0x222222, 0.95);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, btnRadius);
        btnBg.lineStyle(3, 0xffffff, 1);
        btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, btnRadius);
        btnBg.setScrollFactor(0);
        btnBg.setDepth(2000);

        // interactive rectangle (invisible) that exactly matches the button area
        const btnHit = this.add.rectangle(btnX, btnY, btnW, btnH, 0x000000, 0)
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(2001);

        // label text
        const btnText = this.add.text(btnX + btnW / 2, btnY + btnH / 2, "RESET CHECKPOINTS", {
            fontSize: "20px",
            fontFamily: "Arial",
            color: "#ffffff",
            align: "center",
            wordWrap: { width: btnW - 20 }
        })
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2002);

        // pointer feedback - press visual
        btnHit.on('pointerdown', () => {
            btnBg.clear();
            btnBg.fillStyle(0x1a1a1a, 0.95);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, btnRadius);
            btnBg.lineStyle(3, 0xffffff, 1);
            btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, btnRadius);
        });
        btnHit.on('pointerup', () => {
            btnBg.clear();
            btnBg.fillStyle(0x222222, 0.95);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, btnRadius);
            btnBg.lineStyle(3, 0xffffff, 1);
            btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, btnRadius);

            // Reset logic
            checkpoints.forEach(cp => {
                cp.reached = false;
                cp.setTexture("checkpoint_white");
            });

            lastCheckpoint = null;
            localStorage.removeItem("lastCheckpoint");

            // kill + respawn at start
            respawnPlayer();
        });

        // assure clicks on the text also count (some browsers deliver pointer to topmost object)
        btnText.setInteractive({ useHandCursor: true }).on('pointerdown', () => {
            btnHit.emit('pointerdown');
        }).on('pointerup', () => {
            btnHit.emit('pointerup');
        });

        // ---------------------------------------------------------
        // Ensure player spawns at saved checkpoint immediately on start
        // ---------------------------------------------------------
        // call respawnPlayer after a tiny delay to allow physics bodies to initialize
        // (this is short and deterministic; prevents starting at default and then teleporting)
        this.time.delayedCall(50, respawnPlayer, [], this);
    }

    // ---------------------------------------------------------
    // HELPER FUNCTIONS
    // ---------------------------------------------------------
    function enemyBlockedAhead(enemy) {
        const dir = enemy.direction;
        const px = enemy.x + dir * (ENEMY_SIZE / 2 + 6);
        const py = enemy.y;

        for (const b of stoneBlocks)
            if (Math.abs(b.x - px) < stoneW / 2 && Math.abs(b.y - py) < stoneH * 0.9) return true;

        for (const b of spikeBlocks)
            if (Math.abs(b.x - px) < stoneW / 2 && Math.abs(b.y - py) < stoneH * 0.9) return true;

        return false;
    }

    function enemyHasGroundAhead(enemy) {
        const dir = enemy.direction;
        const px = enemy.x + dir * stoneW;
        const py = enemy.y + stoneH;

        for (const b of stoneBlocks)
            if (Math.abs(b.x - px) < stoneW / 2 && Math.abs(b.y - py) < stoneH / 2) return true;

        for (const g of groundBlocks)
            if (Math.abs(g.x - px) < grassScaledWidth / 2 && Math.abs(g.y - py) < grassScaledHeight / 2) return true;

        return false;
    }

    function enemySeesPlayer(enemy, player) {
        if (!enemy.active || !player.active) return false;

        const dx = player.x - enemy.x;
        const dirToPlayer = dx > 0 ? 1 : -1;

        const absdx = Math.abs(dx);
        const front = 600;
        const back = 200;

        if (absdx > (dirToPlayer === enemy.direction ? front : back)) return false;

        const step = 8;
        const steps = Math.ceil(absdx / step);
        for (let i = 1; i <= steps; i++) {
            const checkX = enemy.x + dirToPlayer * i * step;

            for (const blk of allBlocks) {
                if (!blk || blk === player || blk === enemy) continue;

                const bounds = blk.getBounds();
                if (!bounds) continue;

                if (checkX >= bounds.left &&
                    checkX <= bounds.right &&
                    enemy.y >= bounds.top &&
                    enemy.y <= bounds.bottom
                ) return false;
            }
        }

        // require the player to overlap the sight line vertically (same row)
        return Math.abs(enemy.y - player.y) < ENEMY_SIZE;
    }

    function playerHitEnemy(playerObj, enemyObj) {
        if (!playerObj.active || !enemyObj.active) return;

        const verticalGap = enemyObj.y - playerObj.y;
        const holdingS = wasd.S.isDown || (cursors.down && cursors.down.isDown);

        if (verticalGap > 30 && holdingS && playerObj.body.velocity.y > 0) {
            killEnemy(enemyObj);
            return;
        }

        respawnPlayer();
    }

    function killEnemy(enemyObj) {
        if (!enemyObj.active) return;
        enemyObj.disableBody(true, true);
    }

    function respawnPlayer() {
        let x = 100;
        let y = window.innerHeight - 32 - (grassScaledHeight / 2) - (ENEMY_SIZE / 2) - 20;

        if (lastCheckpoint) {
            x = lastCheckpoint.x;
            // place player slightly above checkpoint square (so they don't overlap the checkpoint texture)
            y = lastCheckpoint.y - CHECKPOINT_SIZE / 2 - (ENEMY_SIZE / 2) - 2;
        }

        // disable then re-enable player body so collisions are reset
        if (player && player.body) {
            player.disableBody(true, true);
        }

        // short delay to let physics/objects settle (keeps behavior stable across browsers)
        setTimeout(() => {
            if (player) {
                player.enableBody(true, x, y, true, true);
                // reset state
                player.setVelocity(0, 0);
                player.isFastFalling = false;
            }
            respawnEnemies();
        }, 100);
    }

    function respawnEnemies() {
        for (const enemy of enemies) {
            // return alive enemies to their spawn
            enemy.setPosition(enemy.spawnX, enemy.spawnY);
            if (!enemy.active) enemy.enableBody(true, enemy.spawnX, enemy.spawnY, true, true);

            enemy.state = 'patrol';
            enemy.direction = enemy.initialDirection;
            enemy.setVelocityX(enemy.direction * ENEMY_PATROL_SPEED);
        }
    }

    // ---------------------------------------------------------
    // UPDATE LOOP
    // ---------------------------------------------------------
    function update() {
        // movement
        if (!player || !player.body) return;

        player.setVelocityX(0);

        if (cursors.left.isDown || wasd.A.isDown)
            player.setVelocityX(-PLAYER_SPEED);
        else if (cursors.right.isDown || wasd.D.isDown)
            player.setVelocityX(PLAYER_SPEED);

        if ((cursors.up.isDown || wasd.W.isDown) && player.body.touching.down)
            player.setVelocityY(JUMP_STRENGTH);

        if ((cursors.down.isDown || wasd.S.isDown) && !player.body.touching.down) {
            if (!player.isFastFalling) {
                player.setVelocityY(player.body.velocity.y > 0 ? player.body.velocity.y * 2 : PLAYER_SPEED / 2);
                player.isFastFalling = true;
            }
        } else {
            if (player.isFastFalling) {
                if (player.body.velocity.y > 0)
                    player.setVelocityY(player.body.velocity.y / 2);
                player.isFastFalling = false;
            }
        }

        // ---------------- ENEMY AI ----------------
        sightGraphics.clear();
        sightGraphics.lineStyle(2, 0xff0000, 1);

        enemies.forEach(enemy => {
            if (!enemy.active) return;

            sightGraphics.beginPath();
            sightGraphics.moveTo(enemy.x, enemy.y - 10);
            sightGraphics.lineTo(enemy.x + enemy.direction * 600, enemy.y - 10);
            sightGraphics.strokePath();

            sightGraphics.beginPath();
            sightGraphics.moveTo(enemy.x, enemy.y + 10);
            sightGraphics.lineTo(enemy.x - enemy.direction * 200, enemy.y + 10);
            sightGraphics.strokePath();

            const sees = enemySeesPlayer(enemy, player);

            if (sees) enemy.state = "chase";
            else if (enemy.state === "chase") enemy.state = "patrol";

            if (enemy.state === "patrol") {
                enemy.setVelocityX(enemy.direction * ENEMY_PATROL_SPEED);

                if (enemyBlockedAhead(enemy) || !enemyHasGroundAhead(enemy)) {
                    enemy.direction *= -1;
                    enemy.setVelocityX(enemy.direction * ENEMY_PATROL_SPEED);
                }

            } else if (enemy.state === "chase") {
                const dir = player.x > enemy.x ? 1 : -1;
                enemy.direction = dir;

                if (enemyHasGroundAhead(enemy))
                    enemy.setVelocityX(dir * PLAYER_SPEED * ENEMY_CHASE_MULT);
                else
                    enemy.setVelocityX(0);
            }
        });
    }
});
