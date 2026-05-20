// =========================================================
// ADJUSTABLE GAME SETTINGS
// =========================================================

const SETTINGS = {

    // ---------------- WORLD ----------------
    WORLD_WIDTH: 25000,
    GRAVITY: 2000,

    // ---------------- PLAYER ----------------
    PLAYER_SIZE: 50,
    PLAYER_START_X: 100,

    PLAYER_SPEED: 900,
    PLAYER_AIR_FASTFALL_MULT: 5,

    JUMP_STRENGTH: -1000,
    PLAYER_RESPAWN_DELAY: 3000,
    PLAYER_RESPAWN_FREEZE_DELAY: 1000,

    // ---------------- ENEMY ----------------
    ENEMY_PATROL_SPEED: 150,
    ENEMY_CHASE_SPEED_MULT: 1.1,

    ENEMY_FRONT_RANGE: 600,
    ENEMY_BACK_RANGE: 200,

    ENEMY_VISION_STEP: 8,

    // ---------------- CHECKPOINT ----------------
    CHECKPOINT_SIZE: 32,
    CHECKPOINT_STORAGE_KEY: 'lastCheckpoint',

    // ---------------- CAMERA ----------------
    CAMERA_LERP_X: 0.15,
    CAMERA_LERP_Y: 0.15,

    CAMERA_DEADZONE_X: 0.25,
    CAMERA_DEADZONE_Y: 0.5,

    // ---------------- TEXTURE SCALE ----------------
    GRASS_SCALE: 0.0625,
    STONE_SCALE: 0.0625,

    //ENEMIES
    ENEMY_POSITIONS: [
        {
            x: 64 * 32,
            yOffset: 250
        },
    
        {
            x: 64 * 54,
            yOffset: 200
        },
    
        {
            x: 64 * 76,
            yOffset: 450
        },
    
        {
            x: 64 * 96,
            yOffset: 250
        }
    ],
};

window.addEventListener('load', function () {

    const config = {
        type: Phaser.AUTO,

        width: window.innerWidth,
        height: window.innerHeight,

        physics: {
            default: 'arcade',
            arcade: {
                gravity: { y: SETTINGS.GRAVITY },
                debug: false
            }
        },

        scene: {
            preload,
            create,
            update
        }
    };

    new Phaser.Game(config);

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

    let grassScale;
    let grassScaledWidth;
    let grassScaledHeight;

    let stoneScale;
    let stoneW;
    let stoneH;
    let blockWidth;
    let blockHeight;

    let deathPixels = [];
    let sceneRef;

    // =====================================================
    // PRELOAD
    // =====================================================

    function preload() {

        this.load.image('grass', 'assets/Grass.png');
        this.load.image('stone', 'assets/Stone.png');
        this.load.image('spike', 'assets/Spikes.png');

        // PLAYER

        const p = this.add.graphics();

        p.fillStyle(0x00ff00, 1);

        p.fillRect(
            0,
            0,
            SETTINGS.PLAYER_SIZE,
            SETTINGS.PLAYER_SIZE
        );

        p.generateTexture(
            'player',
            SETTINGS.PLAYER_SIZE,
            SETTINGS.PLAYER_SIZE
        );

        p.destroy();

        // ENEMY

        const e = this.add.graphics();

        e.fillStyle(0xff0000, 1);

        e.fillRect(
            0,
            0,
            SETTINGS.PLAYER_SIZE,
            SETTINGS.PLAYER_SIZE
        );

        e.generateTexture(
            'enemy',
            SETTINGS.PLAYER_SIZE,
            SETTINGS.PLAYER_SIZE
        );

        e.destroy();

        // CHECKPOINT WHITE

        const c1 = this.add.graphics();

        c1.fillStyle(0xffffff, 1);

        c1.fillRect(
            0,
            0,
            SETTINGS.CHECKPOINT_SIZE,
            SETTINGS.CHECKPOINT_SIZE
        );

        c1.generateTexture(
            'checkpoint_white',
            SETTINGS.CHECKPOINT_SIZE,
            SETTINGS.CHECKPOINT_SIZE
        );

        c1.destroy();

        // CHECKPOINT BLUE

        const c2 = this.add.graphics();

        c2.fillStyle(0x0000ff, 1);

        c2.fillRect(
            0,
            0,
            SETTINGS.CHECKPOINT_SIZE,
            SETTINGS.CHECKPOINT_SIZE
        );

        c2.generateTexture(
            'checkpoint_blue',
            SETTINGS.CHECKPOINT_SIZE,
            SETTINGS.CHECKPOINT_SIZE
        );

        c2.destroy();
    }

    // =====================================================
    // CREATE
    // =====================================================

    function create() {

        sceneRef = this;

        const groundY = window.innerHeight - 32;

        this.cameras.main.setBounds(
            0,
            0,
            SETTINGS.WORLD_WIDTH,
            window.innerHeight
        );

        this.physics.world.setBounds(
            0,
            0,
            SETTINGS.WORLD_WIDTH,
            window.innerHeight
        );

        // =================================================
        // SCALE
        // =================================================

        grassScale = SETTINGS.GRASS_SCALE;

        const grassTexture = this.textures.get('grass');

        grassScaledWidth =
            grassTexture.getSourceImage().width * grassScale;

        grassScaledHeight =
            grassTexture.getSourceImage().height * grassScale;

        const stoneTexture = this.textures.get('stone');

        blockWidth = stoneTexture.getSourceImage().width;
        blockHeight = stoneTexture.getSourceImage().height;

        stoneScale = SETTINGS.STONE_SCALE;

        stoneW = blockWidth * stoneScale;
        stoneH = blockHeight * stoneScale;

        // =================================================
        // GROUND
        // =================================================

        for (
            let x = 0;
            x < SETTINGS.WORLD_WIDTH;
            x += grassScaledWidth
        ) {

            const block = this.physics.add.image(
                x,
                groundY,
                'grass'
            );

            block.setScale(grassScale);

            block.setImmovable(true);

            block.body.setAllowGravity(false);

            groundBlocks.push(block);
            allBlocks.push(block);
        }

        // =================================================
        // PLAYER
        // =================================================

        const playerY =
            groundY
            - (grassScaledHeight / 2)
            - (SETTINGS.PLAYER_SIZE / 2)
            - 20;

        player = this.physics.add.sprite(
            SETTINGS.PLAYER_START_X,
            playerY,
            'player'
        );

        player.setCollideWorldBounds(true);

        player.isFastFalling = false;

        // CAMERA

        this.cameras.main.startFollow(
            player,
            true,
            0.1,
            0.1
        );

        this.cameras.main.setLerp(
            SETTINGS.CAMERA_LERP_X,
            SETTINGS.CAMERA_LERP_Y
        );

        this.cameras.main.setDeadzone(
            window.innerWidth * SETTINGS.CAMERA_DEADZONE_X,
            window.innerHeight * SETTINGS.CAMERA_DEADZONE_Y
        );

        // COLLISION

        groundBlocks.forEach(block => {
            this.physics.add.collider(player, block);
        });

        // =================================================
        // PLATFORMS
        // =================================================

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

                const s = this.physics.add.image(
                    obj.x + i * stoneW - stoneW / 2,
                    obj.y - stoneH / 2,
                    'stone'
                );

                s.setScale(stoneScale);

                s.setImmovable(true);

                s.body.setAllowGravity(false);

                this.physics.add.collider(player, s);

                stoneBlocks.push(s);

                plat.push(s);

                allBlocks.push(s);
            }

            platforms.push(plat);
        });

        // =================================================
        // TOP SPIKES
        // =================================================

        const spikePositions = [
            { x: 64 * 29 - 32, y: groundY - 250 },
            { x: 64 * 40 - 32, y: groundY - 300 },
            { x: 64 * 63 - 32, y: groundY - 350 }
        ];

        spikePositions.forEach(pos => {

            const sp = this.physics.add.image(
                pos.x - stoneH / 2,
                pos.y - stoneH * 1.5,
                'spike'
            );

            sp.setDisplaySize(stoneW, stoneH);

            sp.setImmovable(true);

            sp.body.setAllowGravity(false);

            this.physics.add.collider(
                player,
                sp,
                shatterPlayer
            );

            spikeBlocks.push(sp);

            allBlocks.push(sp);
        });

        // =================================================
        // BOTTOM SPIKES
        // =================================================

        const spWidth = blockWidth * grassScale;

        const minX = Math.min(
            ...stoneObjects.map(o => o.x)
        );

        const maxX = Math.max(
            ...stoneObjects.map(
                o => o.x + o.width * stoneW
            )
        );

        const spikeY =
            groundY
            - (grassScaledHeight / 2)
            - (spWidth / 2);

        for (
            let x = minX;
            x <= maxX;
            x += spWidth
        ) {

            const sp = this.physics.add.image(
                x - spWidth / 2,
                spikeY,
                'spike'
            );

            sp.setDisplaySize(spWidth, spWidth);

            sp.setImmovable(true);

            sp.body.setAllowGravity(false);

            this.physics.add.collider(
                player,
                sp,
                shatterPlayer
            );

            spikeBlocks.push(sp);

            allBlocks.push(sp);
        }

        // =================================================
        // CONTROLS
        // =================================================

        cursors = this.input.keyboard.createCursorKeys();

        wasd = this.input.keyboard.addKeys('W,S,A,D');

        // =================================================
        // ENEMY GRAPHICS
        // =================================================

        sightGraphics = this.add.graphics().setDepth(1000);

        // =================================================
        // ENEMIES
        // =================================================

        spawnEnemies()

        // =================================================
        // CHECKPOINTS
        // =================================================

        const checkpointPositions = [

            { x: 64 * 21 - 64, y: groundY - 350 },

            { x: 64 * 66 - 64, y: groundY - 450 },

            { x: 64 * 135 - 64, y: groundY - 380 }
        ];

        const savedCheckpoint =
            localStorage.getItem(
                SETTINGS.CHECKPOINT_STORAGE_KEY
            );

        lastCheckpoint =
            savedCheckpoint
                ? JSON.parse(savedCheckpoint)
                : null;

        checkpointPositions.forEach(pos => {

            const cp = this.physics.add.sprite(
                pos.x,
                pos.y,
                'checkpoint_white'
            );

            cp.reached = false;

            cp.setDisplaySize(
                SETTINGS.CHECKPOINT_SIZE,
                SETTINGS.CHECKPOINT_SIZE
            );

            cp.body.setAllowGravity(false);

            cp.setImmovable(true);

            cp.setAngle(45);

            if (
                lastCheckpoint &&
                Math.abs(cp.x - lastCheckpoint.x) < 1 &&
                Math.abs(cp.y - lastCheckpoint.y) < 1
            ) {

                cp.reached = true;

                cp.setTexture('checkpoint_blue');

                lastCheckpoint = cp;
            }

            this.physics.add.overlap(
                player,
                cp,
                () => {

                    if (cp.reached) return;

                    checkpoints.forEach(other => {

                        other.reached = false;

                        other.setTexture('checkpoint_white');
                    });

                    cp.reached = true;

                    cp.setTexture('checkpoint_blue');

                    lastCheckpoint = cp;

                    localStorage.setItem(
                        SETTINGS.CHECKPOINT_STORAGE_KEY,
                        JSON.stringify({
                            x: cp.x,
                            y: cp.y
                        })
                    );
                }
            );

            checkpoints.push(cp);
        });

        // =================================================
        // RESET BUTTON
        // =================================================

        const btnX = 20;
        const btnY = 20;
        const btnW = 260;
        const btnH = 70;
        const btnRadius = 20;

        const btnBg = this.add.graphics();

        function drawButton(color) {

            btnBg.clear();

            btnBg.fillStyle(color, 0.95);

            btnBg.fillRoundedRect(
                btnX,
                btnY,
                btnW,
                btnH,
                btnRadius
            );

            btnBg.lineStyle(3, 0xffffff, 1);

            btnBg.strokeRoundedRect(
                btnX,
                btnY,
                btnW,
                btnH,
                btnRadius
            );
        }

        drawButton(0x222222);

        btnBg.setScrollFactor(0);

        btnBg.setDepth(2000);

        const btnHit = this.add.rectangle(
            btnX,
            btnY,
            btnW,
            btnH,
            0x000000,
            0
        );

        btnHit
            .setOrigin(0)
            .setInteractive({ useHandCursor: true })
            .setScrollFactor(0)
            .setDepth(2001);

        const btnText = this.add.text(
            btnX + btnW / 2,
            btnY + btnH / 2,
            'RESET CHECKPOINTS',
            {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }
        );

        btnText
            .setOrigin(0.5)
            .setScrollFactor(0)
            .setDepth(2002);

        btnHit.on('pointerdown', () => {
            drawButton(0x1a1a1a);
        });

        btnHit.on('pointerup', () => {

            drawButton(0x222222);

            checkpoints.forEach(cp => {

                cp.reached = false;

                cp.setTexture('checkpoint_white');
            });

            lastCheckpoint = null;

            localStorage.removeItem(
                SETTINGS.CHECKPOINT_STORAGE_KEY
            );

            shatterPlayer();
        });

        // =================================================
        // START
        // =================================================

        this.time.delayedCall(
            50,
            respawnPlayer,
            [],
            this
        );
    }

    // =====================================================
    // ENEMY SPAWN
    // =====================================================
    function spawnEnemies() {

        // destroy old enemies
        enemies.forEach(enemy => {
    
            if (enemy && enemy.active) {
                enemy.destroy();
            }
        });
    
        enemies = [];
    
        SETTINGS.ENEMY_POSITIONS.forEach(pos => {
    
            const enemyY =
                window.innerHeight
                - 32
                - pos.yOffset
                - SETTINGS.PLAYER_SIZE
                - 64;

            const enemy =
                sceneRef.physics.add.sprite(
                    pos.x,
                    enemyY,
                    'enemy'
                );
    
            enemy.setCollideWorldBounds(true);
    
            enemy.setBounce(0);
    
            enemy.body.setSize(
                SETTINGS.PLAYER_SIZE,
                SETTINGS.PLAYER_SIZE
            );
    
            enemy.direction = 1;
    
            // world collision
            groundBlocks.forEach(block => {
    
                sceneRef.physics.add.collider(
                    enemy,
                    block
                );
            });
    
            stoneBlocks.forEach(block => {
    
                sceneRef.physics.add.collider(
                    enemy,
                    block
                );
            });
    
            // spike death
            spikeBlocks.forEach(spike => {
    
                sceneRef.physics.add.collider(
                    enemy,
                    spike,
                    () => {
    
                        shatterEnemy(enemy);
                    }
                );
            });
    
            // player collision
            sceneRef.physics.add.collider(
                player,
                enemy,
                () => {
    
                    if (
                        !player.active ||
                        !enemy.active
                    ) {
                        return;
                    }
    
                    const stomping =
    
                        player.isFastFalling &&
    
                        player.y < enemy.y + 10
    
                    if (stomping) {
    
                        player.setVelocityY(
                            SETTINGS.JUMP_STRENGTH * 0.6
                        );
    
                        shatterEnemy(enemy);
                    }
    
                    else {
    
                        shatterPlayer();
                    }
                }
            );
    
            enemies.push(enemy);
        });
    }

    // =====================================================
    // RESPAWN
    // =====================================================

    function respawnPlayer() {

        let x = SETTINGS.PLAYER_START_X;

        let y =
            window.innerHeight
            - 32
            - (grassScaledHeight / 2)
            - (SETTINGS.PLAYER_SIZE / 2)
            - 20;

        if (lastCheckpoint) {

            x = lastCheckpoint.x;

            y =
                lastCheckpoint.y
                - SETTINGS.CHECKPOINT_SIZE / 2
                - (SETTINGS.PLAYER_SIZE / 2)
                - 2;
        }

        setTimeout(() => {

            if (!player || !player.body) return;

            // remove old death pixels
            deathPixels.forEach(pixel => {
            
                if (pixel && pixel.active) {
                
                    pixel.destroy();
                }
            });

            deathPixels = [];

            player.enableBody(
                true,
                x,
                y,
                true,
                true
            );

            spawnEnemies();

            player.setVelocity(0, 0);

            player.isFastFalling = false;

            // temporary freeze after spawning
            player.body.enable = false;

            setTimeout(() => {

                if (player && player.body) {

                    player.body.enable = true;
                }

            }, SETTINGS.PLAYER_RESPAWN_FREEZE_DELAY);

        }, SETTINGS.PLAYER_RESPAWN_DELAY);
    }

    // =====================================================
    // PLAYER SHATTER EFFECT
    // =====================================================

    function shatterPlayer() {

        // prevent duplicate deaths
        if (!player.active) return;

        const pixelSize = 5;

        const piecesPerRow =
            SETTINGS.PLAYER_SIZE / pixelSize;

        const startX =
            player.x - SETTINGS.PLAYER_SIZE / 2;

        const startY =
            player.y - SETTINGS.PLAYER_SIZE / 2;

        // hide player
        player.disableBody(true, true);

        // create chunks
        for (let py = 0; py < piecesPerRow; py++) {

            for (let px = 0; px < piecesPerRow; px++) {

                const pixel =
                    sceneRef.physics.add.image(
                        startX + px * pixelSize,
                        startY + py * pixelSize,
                        'player'
                    );

                pixel.setDisplaySize(
                    pixelSize,
                    pixelSize
                );

                // =================================================
                // EXPLOSION VELOCITY
                // =================================================

                const dirX =
                    (px - piecesPerRow / 2)
                    * Phaser.Math.FloatBetween(35, 75);

                const dirY =
                    (py - piecesPerRow / 2)
                    * Phaser.Math.FloatBetween(20, 50);

                const horizontalSpeed =
                    dirX
                    + Phaser.Math.Between(-120, 120);

                const verticalSpeed =
                    -900
                    + dirY
                    + Phaser.Math.Between(-350, 150);

                pixel.setVelocity(
                    horizontalSpeed,
                    verticalSpeed
                );

                // delayed turbulence
                sceneRef.time.delayedCall(
                    Phaser.Math.Between(50, 180),
                    () => {

                        if (!pixel.body) return;

                        pixel.setVelocityX(
                            pixel.body.velocity.x
                            + Phaser.Math.Between(-40, 40)
                        );
                    }
                );

                // =================================================
                // PHYSICS
                // =================================================

                pixel.setBounce(0.96);

                pixel.setDrag(40);

                pixel.setMass(0.1);

                pixel.setFriction(1, 0);

                // slower falling
                pixel.body.setGravityY(
                    SETTINGS.GRAVITY * 0.28
                );

                // no spinning
                pixel.setAngularVelocity(0);

                pixel.setAngularDrag(99999);

                // =================================================
                // COLLISIONS
                // =================================================

                // groundBlocks.forEach(block => {

                //     sceneRef.physics.add.collider(
                //         pixel,
                //         block,
                //         () => {

                //             if (
                //                 Math.abs(pixel.body.velocity.y) < 80
                //             ) {

                //                 pixel.setVelocityX(0);
                //                 pixel.setAccelerationX(0);
                //             }
                //         }
                //     );
                // });

                // stoneBlocks.forEach(block => {

                //     sceneRef.physics.add.collider(
                //         pixel,
                //         block,
                //         () => {

                //             if (
                //                 Math.abs(pixel.body.velocity.y) < 80
                //             ) {

                //                 pixel.setVelocityX(0);
                //                 pixel.setAccelerationX(0);
                //             }
                //         }
                //     );
                // });

                deathPixels.push(pixel);
            }
        }

        // respawn player
        respawnPlayer();
    }

    // =====================================================
    // ENEMY SHATTER EFFECT
    // =====================================================

    function shatterEnemy(enemy) {

        if (!enemy.active) return;

        const pixelSize = 5;

        const piecesPerRow =
            SETTINGS.PLAYER_SIZE / pixelSize;

        const startX =
            enemy.x - SETTINGS.PLAYER_SIZE / 2;

        const startY =
            enemy.y - SETTINGS.PLAYER_SIZE / 2;

        enemy.disableBody(true, true);

        // remove from enemy array
        enemies = enemies.filter(
            e => e !== enemy
        );

        for (let py = 0; py < piecesPerRow; py++) {

            for (let px = 0; px < piecesPerRow; px++) {

                const pixel =
                    sceneRef.physics.add.image(
                        startX + px * pixelSize,
                        startY + py * pixelSize,
                        'enemy'
                    );

                pixel.setDisplaySize(
                    pixelSize,
                    pixelSize
                );

                const dirX =
                    (px - piecesPerRow / 2)
                    * Phaser.Math.FloatBetween(30, 70);

                const dirY =
                    (py - piecesPerRow / 2)
                    * Phaser.Math.FloatBetween(20, 45);

                const horizontalSpeed =
                    dirX
                    + Phaser.Math.Between(-100, 100);

                const verticalSpeed =
                    -850
                    + dirY
                    + Phaser.Math.Between(-300, 120);

                pixel.setVelocity(
                    horizontalSpeed,
                    verticalSpeed
                );

                pixel.setBounce(0.96);

                pixel.setDrag(40);

                pixel.setMass(0.1);

                pixel.setFriction(1, 0);

                pixel.body.setGravityY(
                    SETTINGS.GRAVITY * 0.28
                );

                pixel.setAngularVelocity(0);

                pixel.setAngularDrag(99999);

                // collisions
                // groundBlocks.forEach(block => {

                //     sceneRef.physics.add.collider(
                //         pixel,
                //         block,
                //         () => {

                //             if (
                //                 Math.abs(pixel.body.velocity.y) < 80
                //             ) {

                //                 pixel.setVelocityX(0);
                //             }
                //         }
                //     );
                // });

                // stoneBlocks.forEach(block => {

                //     sceneRef.physics.add.collider(
                //         pixel,
                //         block,
                //         () => {

                //             if (
                //                 Math.abs(pixel.body.velocity.y) < 80
                //             ) {

                //                 pixel.setVelocityX(0);
                //             }
                //         }
                //     );
                // });

                // cleanup enemy pixels
                sceneRef.time.delayedCall(
                    SETTINGS.PLAYER_RESPAWN_DELAY,
                    () => {

                        if (pixel && pixel.active) {
                            pixel.destroy();
                        }
                    }
                );
            }
        }
    }

    // =====================================================
    // UPDATE
    // =====================================================

    function update() {

        if (!player || !player.body) {
            return;
        }

        // =================================================
        // PLAYER MOVEMENT
        // =================================================

        player.setVelocityX(0);

        // LEFT

        if (cursors.left.isDown || wasd.A.isDown) {

            player.setVelocityX(
                -SETTINGS.PLAYER_SPEED
            );
        }

        // RIGHT

        else if (
            cursors.right.isDown ||
            wasd.D.isDown
        ) {

            player.setVelocityX(
                SETTINGS.PLAYER_SPEED
            );
        }

        // JUMP

        if (
            (
                cursors.up.isDown ||
                wasd.W.isDown
            ) &&
            player.body.touching.down
        ) {

            player.setVelocityY(
                SETTINGS.JUMP_STRENGTH
            );
        }

        // FAST FALL

        if (
            (
                cursors.down.isDown ||
                wasd.S.isDown
            ) &&
            !player.body.touching.down
        ) {

            if (!player.isFastFalling) {

                player.setVelocityY(
                    player.body.velocity.y > 0
                        ? player.body.velocity.y
                        * SETTINGS.PLAYER_AIR_FASTFALL_MULT
                        : SETTINGS.PLAYER_SPEED / 2
                );

                player.isFastFalling = true;
            }
        }

        else {

            player.isFastFalling = false;
        }

        // =================================================
        // ENEMY AI
        // =================================================

        enemies.forEach(enemy => {
        
            if (!enemy.active) return;
        
            const distToPlayer =
                player.x - enemy.x;
        
            const absDist =
                Math.abs(distToPlayer);
        
            // =================================================
            // LOOK AHEAD
            // =================================================
        
            const lookAheadX =
                enemy.x + (enemy.direction * 40);
        
            const lookAheadY =
                enemy.y + 50;
        
            let groundAhead = false;
        
            // ONLY stone platforms count
            stoneBlocks.forEach(block => {
            
                if (
                
                    Math.abs(block.x - lookAheadX) < stoneW / 2 &&
                
                    Math.abs(block.y - lookAheadY) < stoneH / 2
                ) {
                
                    groundAhead = true;
                }
            });
        
            // =================================================
            // SPIKE CHECK
            // =================================================
        
            let spikeAhead = false;
        
            spikeBlocks.forEach(spike => {
            
                if (
                
                    Math.abs(spike.x - lookAheadX) < stoneW / 2 &&
                
                    Math.abs(spike.y - enemy.y) < 80
                ) {
                
                    spikeAhead = true;
                }
            });
        
            // =================================================
            // TURN AROUND
            // =================================================
        
            if (!groundAhead || spikeAhead) {
            
                enemy.direction *= -1;
            }
        
            // =================================================
            // MOVEMENT
            // =================================================
        
            // chase player only if safe
            if (
                absDist < SETTINGS.ENEMY_FRONT_RANGE
            ) {
            
                const chaseDir =
                    distToPlayer > 0 ? 1 : -1;
            
                // test future direction safety
                const testX =
                    enemy.x + (chaseDir * 40);
            
                const testY =
                    enemy.y + 50;
            
                let safeGround = false;
            
                stoneBlocks.forEach(block => {
            
                    if (
            
                        Math.abs(block.x - testX) < stoneW / 2 &&
            
                        Math.abs(block.y - testY) < stoneH / 2
                    ) {
            
                        safeGround = true;
                    }
                });
            
                let dangerSpike = false;
            
                spikeBlocks.forEach(spike => {
            
                    if (
            
                        Math.abs(spike.x - testX) < stoneW / 2 &&
            
                        Math.abs(spike.y - enemy.y) < 80
                    ) {
            
                        dangerSpike = true;
                    }
                });
            
                // ONLY chase if safe
                if (safeGround && !dangerSpike) {
            
                    enemy.direction = chaseDir;
                }
            
                enemy.setVelocityX(
                    SETTINGS.ENEMY_PATROL_SPEED
                    * SETTINGS.ENEMY_CHASE_SPEED_MULT
                    * enemy.direction
                );
            }
        
            // patrol
            else {
            
                enemy.setVelocityX(
                    SETTINGS.ENEMY_PATROL_SPEED
                    * enemy.direction
                );
            }
        });

    sightGraphics.clear();
    }
});