ig.module(
	'game.projectile'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityProjectile = ig.Box2DEntity.extend({
        size: { x: 8, y: 8 },
        zIndex: 205,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        name: 'bullet',
        animSheet: new ig.AnimationSheet('media/projectiles.png', 8, 8),
        animrepeat: false,
        animspeed: .2,
        //custom Properties
        active: true,
        id: 0,//What type of projectile is it? Used for pooling.
        tileset: [0],
        lifespan: 120,//120 frames
        hasLifespan: true,//Does the projectile have a limit on it's life?
        bulletvelocity: 25,
        effValue: 0, //If the effect causes a number impact, what is it's value.
        deathEffect: false,//For box2d timing
        effectFiring: false,
        deathsound: null, 
        damage: { hp: 1, mp: 1 },
        bulletType: "none", //What effect does it cause when it hits?Dies?
        explodePrjId: 9,//If it explodes, what does it generate
        team: 0, //Who does not take damage from the projectile?
        accuracy: 5, //How accuracte is it, the lower the better.       
        owner: null,
        ownerRID: null,
        collidedWithRid: 0,
        density: .001,
        collisionGroup: -9,
        categoryBits: ig.global.COL_BULLET_LOCAL,      // collsion type localBullet, 0x0010 for netbullet
        //maskBits: ~0x0002 && 0xFFFF,        // does not collide with LocalPlayer and collides with everything else
        maskBits: ig.global.COL_ALL && ~ig.global.COL_PLAYER && ~ig.global.COL_PLAYER_ARMOR && ~ig.global.COL_BULLET_NET && ~ig.global.COL_PLAYER_WEAPON && ~ig.global.COL_NETPLAYER_WEAPON && ~ig.global.COL_BULLET_LOCAL && ~ig.global.COL_NETPLAYER_ARMOR,
        init: function (x, y, settings) {
            this.parent(x, y, settings);

            this.addAnim('idle', this.animspeed, this.tileset, this.animrepeat);
            this.body.bullet = true;
            this.body.userData = "bullet";


            var newFilterData = new Box2D.Dynamics.b2FilterData;
            //newFilterData.groupIndex = this.collisionGroup;
            newFilterData.categoryBits = this.categoryBits;
            newFilterData.maskBits = this.maskBits;
            this.body.GetFixtureList().SetFilterData(newFilterData);

            //Resort entities
            ig.game.sortEntitiesDeferred();
        },
        update: function () {
            this.parent();
            this.lifespan--;

            if ((this.hasLifespan && this.lifespan <= 0) || (this.animrepeat == true && this.currentAnim.loopCount >= 1) || this.deathEffect) {
                //If explosive, trigger that effect
                if (this.deathsound != null) {
                    this.deathsound.play();
                }

                if (this.deathEffect && (this.ownerRID != this.collidedWithRid) && (this.team != ig.game.player.team) && this.collidedWithRid != 0) {
                    //Trigger impact effect on player since it was collided with.
                    if (this.effValue != 0 && this.effValue != null) {
                        
                        ig.game.player.addStatusEffect(this.effValue.stat, this.effValue.secondsDuration, this.effValue.value, false);
                    }
                }
                this.effect();
                this.kill();
               
            };


        },
        draw: function () {
            //optic check
            var inOpticRange = false;
            if (this.team != ig.game.player.team) {
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                for (var i = 0; i < tEntities.length; i++) {
                    if (tEntities[i].team == ig.game.player.team) {
                        if (this.distanceTo(tEntities[i]) < (tEntities[i].optics + 100)) {
                            inOpticRange = true;
                        }
                    }
                }
            }
            if (this.distanceTo(ig.game.player) < (ig.game.player.optics + 100)) {
                inOpticRange = true;
            }
            if (inOpticRange) {
                this.parent();
            }
            
        },
        updateCollisionGroup: function (grpNum) {
            this.collisionGroup = grpNum;
            var newFilterData = new Box2D.Dynamics.b2FilterData;
            newFilterData.groupIndex = this.collisionGroup;
            this.body.GetFixtureList().SetFilterData(newFilterData);
        },
        fire: function (angle, remoteId, team) {
            //All I really need is the owner body angle, owner remote id(For scoring kills/damage), and the team.
            //this.team = owner.team;

            //Create smoke effect
            var smokeEffectRandAngle = Math.random() * ((Math.PI*2) - (0)) + (0);;
            var smokeEffectRandVelX = Math.random() * (16 - (-16)) + (-16);;
            var smokeEffectRandVelY = Math.random() * (16 - (-16)) + (-16);;

            var smokeEffect = ig.game.spawnEntity(EntityEyecandy, this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, {
                size: { x: 16, y: 16 },
                animSheet: new ig.AnimationSheet('media/projectileSmoke.png', 16, 16),
                zIndex: 300,
                tileSeries: [0,1,2,3,4],
                lifespan: 2,
                endloopanim: true,
                setAlpha: .5,
            });
            smokeEffect.currentAnim.angle = smokeEffectRandAngle;
            smokeEffect.vel.x = smokeEffectRandVelX;
            smokeEffect.vel.y = smokeEffectRandVelY;
            //Fire
            this.team = team;//Was 1
            this.ownerRID = remoteId; 
            var velX = Math.cos(angle) * this.bulletvelocity;
            var velY = Math.sin(angle) * this.bulletvelocity;

            this.body.SetAngle(angle);
            this.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(velX, velY), this.body.GetPosition());
            //return { vel: velocity, acc: accuracy };
            return { vel: velX, acc: velY };

        },

        hasCollided: function (srcRid) {
            this.collidedWithRid = srcRid;
            this.deathEffect = true;
        },
        effect: function () {
            if (this.effectFiring == false) {
                this.effectFiring = true;
                //Explosion  -Create new projectiles of knockback and damage in 360 spread.
                if (this.bulletType == 'explode') {
                    //console.log("creating explosion  rID:" + this.ownerRID + " pID: " + ig.game.player.remoteId);
                    var settings = ig.game.db.projectileDbArray[this.explodePrjId];
                    if (this.ownerRID != ig.game.player.remoteId) {

                        //console.log("setting to Net Projectile explosion");

                        settings.categoryBits = 0x0010;//Net Projectile
                        settings.maskBits = 0xFFFF && ~0x0008 && ~0x0040 && ~0x0004;//Does not collside with other projectiles
                    }
                    for (var p = 0; p < 16; p++) {//16 Projectiles, I can work this later.
                        //Create projectile with directional impulse. 360/(16-p)
                        var angle = (360 / 16) * p;
                        //new b2Vec2(50*Math.cos(angle*Math.PI/180),50*Math.sin(angle*Math.PI/180));//Where 50 is the force vel * the angle to coordinate conversion

                        var shrapnel = ig.game.spawnEntity(EntityProjectile, Math.round(this.pos.x + 5 * Math.cos(angle * Math.PI / 180)), Math.round(this.pos.y + 5 * Math.sin(angle * Math.PI / 180)), settings);
                        shrapnel.ownerRID = this.ownerRID;
                        shrapnel.team = this.team;


                        shrapnel.gravityFactor = 0;
                        shrapnel.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(15 * Math.cos(angle * Math.PI / 180), 15 * Math.sin(angle * Math.PI / 180)), this.body.GetPosition());

                    }
                } else if (this.bulletType == 'cannon') {
               
                    var randomImpulseX = Math.floor(Math.random() * (50 - (-50)) + (-50));
                    var randomImpulseY = Math.floor(Math.random() * (50 - (-50)) + (-50));//was 0 instead of -50

                    var impacteffect = ig.game.spawnEntity(EntityEyecandy, this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, {
                        size: { x: 32, y: 32 },
                        animSheet: new ig.AnimationSheet('media/explosions1.png', 32, 32),
                        zIndex: 300,
                        tileSeries: [0, 1, 2, 3, 4],
                        lifespan: .5,
                        endloopanim: true,
                        setAlpha: 1,
                        frameTime: .1
                    });
                    //impacteffect.vel = { x: randomImpulseX, y: randomImpulseY };
                    
                } else if (this.bulletType == 'bullet') {
                    //Bullet sparks can have a higher count.
                    for (var p = 0; p < ig.global.particleCount.applied; p++) {
                        var randomImpulseX = Math.floor(Math.random() * (50 - (-50)) + (-50));
                        var randomImpulseY = Math.floor(Math.random() * (50 - (-50)) + (-50));//was 0 instead of -50

                        var imapcteffect = ig.game.spawnEntity(EntityEyecandy, this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, {
                            size: { x: 1, y: 1 },
                            animSheet: new ig.AnimationSheet('media/particles.png', 1, 1),
                            zIndex: 300,
                            tileSeries: [192, 193, 194, 195],
                            lifespan: .64,
                            endloopanim: true,
                            setAlpha: 1,
                            frameTime: .16,
                        });
                        imapcteffect.vel = { x: randomImpulseX, y: randomImpulseY };
                    }
                } else if (this.bulletType == 'fire') {
                    for (var p = 0; p < ig.global.particleCount.applied; p++) {
                        var randomImpulseX = Math.floor(Math.random() * (50 - (-50)) + (-50));
                        var randomImpulseY = Math.floor(Math.random() * (50 - (-50)) + (-50));//was 0 instead of -50

                        var imapcteffect = ig.game.spawnEntity(EntityEyecandy, this.pos.x + this.size.x / 2, this.pos.y + this.size.y / 2, {
                            size: { x: 32, y: 32 },
                            animSheet: new ig.AnimationSheet('media/fires1.png', 32, 32),
                            zIndex: 300,
                            tileSeries: [0, 1, 2, 3],
                            lifespan: .4,
                            endloopanim: true,
                            setAlpha: 1,
                            frameTime: .10,
                        });
                        
                    }
                }
            }

        },
        activate: function () {

        },
        deactivate: function () {

        },
    });
});
