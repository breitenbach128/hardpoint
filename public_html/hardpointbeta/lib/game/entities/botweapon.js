ig.module(
	'game.entities.botweapon'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityBotweapon = ig.Box2DEntity.extend({
        size: { x: 32, y: 24 },
        zIndex: 300,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        active: true,
        gravityFactor: 0,
        density: 0.1,
        //Box2d Collision Filters
        categoryBits: ig.global.COL_BOT_WEAPON,      // collsion type localBullet, 0x0010 for netbullet
        //maskBits: ~0x0002 && 0xFFFF,        // does not collide with LocalPlayer and collides with everything else
        maskBits: ig.global.COL_NONE,
        entType: "weapon",
        //bodyType: Box2D.Dynamics.b2Body.b2_staticBody,//Create infinite mass body that wont move to avoid rotation
        //Custom Properties
        owner: null,
        group: 0,
        indexId: -1,
        //Weapon Properties
        equipped: false,
        selected:false,
        wptype: "projectile",//projectile, hitscan
        hitscan: {
            ready: false,
            firedelay: 0, //Mostly for hitscan weapons, how long from shoot until it actually hits the target area?
            Target: { x: 0, y: 0 },
            firedelayTimer: null,
        },  
        hp: 100, ////Weapon only moves and fires if it is working. The repair ability can restore these.
        mp: 100, //Morale points on weapon
        buttoned: false, //Weapon only moves and fires if it is not buttoned.
        rof: 1,
        range: 500,//300 pixels 30 meters
        //rofTimer: new ig.Timer(),
        reloading: false,
        reloadTimer: null,
        reloadTime: 5,//Time it takes to reload the weapon. (Seconds)
        rofCt: 0,
        rofTime: 30,//Time it takes to between shots the weapon. (Frames)
        rotationRate: 10,
        abilityCost: 5, //Unused at this time
        ammoCurrent: 100,
        ammoMax: 100,
        wpTileSetIdle: [0],
        wpTileSetShoot: [0, 1, 2],
        //Targeting Variables
        behavior: 0, //1 hold fire, 2 Manual (Fire at mouse cursor)
        lastTarget: null,
        targetAngle: 0,
        lastOptAngle: 0,
        arclimit: false,
        upperlimit: -1,
        lowerlimit: -1,
        pointTarget: null,
        //Projectile Properties
        projectileCount: 1, //How many projectiles to fire?
        bulletID: 0,
        font: new ig.Font('media/04b03.font.png'),
        weaponstate: 'idle',

        animSheet: new ig.AnimationSheet('media/weapons.png', 32, 24),

        init: function (x, y, settings) {
            this.parent(x, y, settings);           

            this.addAnim('idle', .2, this.wpTileSetIdle);
            this.addAnim('shoot', .2, this.wpTileSetShoot);
            this.currentAnim = this.anims.idle;
            //this.currentAnim.flip.x = settings.flip;
            if (!ig.global.wm) {
                //this.body.SetFixedRotation(true);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.groupIndex = -5;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);
                this.body.SetAngularDamping(.5);
                //Dampening (linear and angular)
                this.body.SetLinearDamping(3);//3
            }
            //Build Timers
            this.rofTimer = new ig.Frametimer(this.rofCt, this.rofTime, false);
            this.reloadTimer = new ig.Timer();
            this.reloadTimer.set(this.reloadTime);
            this.reloadTimer.pause();

            this.buttonedTimer = new ig.Timer();
            this.buttonedTimer.pause();

            this.hitscan.firedelayTimer = new ig.Timer();
            this.hitscan.firedelayTimer.pause();

        },
        update: function () {
            if (ig.game.startGame == true) {
                if (ig.global.playerIsHost == true) {
                    if (this.active) {
                        this.parent();
                    
                        if (this.equipped) {
                            //Is the weapon Buttoned? Then set its behavior to hold file
                            //Handle animations
                            if (this.currentAnim.loopCount > 0 && this.currentAnim == this.anims.shoot) {
                                this.weaponstate = 'idle'
                            };//set default state to idle

                            if (this.buttoned) {//Need to play the button animation on HUD as well
                                this.behavior = 1;
                                if (this.buttonedTimer.delta() > 0) {
                                    this.buttoned = false;
                                    this.buttonedTimer.pause();
                                }
                            } else {
                                if (this.wptype == "hitscan") {
                                    if (this.hitscan.firedelayTimer.delta() > 0) {
                                        this.hitscan.firedelayTimer.reset();
                                        this.hitscan.firedelayTimer.pause();
                                        //Create projectile at target location with 0 vels
                                        this.fireHitscan();
                                    }
                                }

                                if (this.behavior == 2) {
                                    if (!this.rofTimer.complete()) {
                                        this.rofTimer.increment();
                                    }                                
                                } else {
                                    this.rofTimer.increment();
                                }
                            
                                //No ammo, reload!
                                if (this.reloading) {
                                    if (this.reloadTimer.delta() >= 0) {
                                        this.reloading = false;
                                        this.ammoCurrent = this.ammoMax;
                                        this.reloadTimer.reset();
                                        this.reloadTimer.pause();
                                        this.rofTimer.setCountToMax();
                                    }

                                } else {
                                    //Check Weapon Behavior
                                    //Check AI owner
                                    if(this.owner != null){
                                        //Aim Weapons and fire! OR just align with body
                                        if (this.owner.ai.attacktarget != null) {
                                            this.aim(this.owner.ai.attacktarget);
                                        } else {                                        
                                            this.body.SetAngle(this.owner.body.GetAngle());                                        
                                        }
                                    }
                                }
                            }

                            if (this.weaponstate == 'idle') {
                                if (this.currentAnim == this.anims.shoot) {
                                    this.currentAnim = this.anims.idle;
                                }                            
                            } else if(this.weaponstate == 'shoot'){
                                if (this.currentAnim == this.anims.idle) {
                                    this.currentAnim = this.anims.shoot.rewind();
                                } 
                            }else {
                                if (this.currentAnim.loopCount > 0) {
                                    this.currentAnim = this.anims.idle.rewind();
                                }
                            }
                        } //END OF EQUIP BLOCK 
                    }
                }//End of isHost check
            }
        },
        draw: function(){
            if (this.active && ig.game.startGame == true) {
                this.parent();
            }
        },
        setIndexId: function(index){
            this.indexId = index;
        },
        aim: function (target) {
            //this.weaponstate = 'aim';

            var rangle = this.angleTo(target);
            var targetAngle = Math.round(rangle * 180 / Math.PI);
            var currentBodyAngle = Math.round(this.body.GetAngle() * 180 / Math.PI);
            this.targetAngle = targetAngle;

            //while (totalRotation < -180 * DEGTORAD) totalRotation += 360 * DEGTORAD;
            //while (totalRotation > 180 * DEGTORAD) totalRotation -= 360 * DEGTORAD;
            //http://box2d.org/forum/viewtopic.php?f=18&t=7306
            //if (targetAngle < 0) { targetAngle = 360 + targetAngle };
            //Angle cap is causing a problem. I could just manually do it by comparing the angle of the weapon body to the owner body.
            var rotations = Math.round(currentBodyAngle / 360);
            if (rotations < 0) { rotations = rotations * -1 };
            if (rotations == 0) { rotations = 1 };
            if (this.arclimit) {
                if (currentBodyAngle < -180) {
                    currentBodyAngle = (360 * rotations) + currentBodyAngle;
                };
                if (currentBodyAngle > 180) {
                    currentBodyAngle = (-360 * rotations) + currentBodyAngle;
                };
            } else {
                if (currentBodyAngle < -180) {
                    currentBodyAngle = (360 * rotations) + currentBodyAngle;
                    this.body.SetAngle(currentBodyAngle* (Math.PI / 180));
                };
                if (currentBodyAngle > 180) {
                    currentBodyAngle = (-360 * rotations) + currentBodyAngle;
                    this.body.SetAngle(currentBodyAngle* (Math.PI / 180));
                };
            }


            if (currentBodyAngle > targetAngle + 3 || currentBodyAngle < targetAngle - 3) {//Give 3 deg range
                var torqueRate = this.rotationRate;
                var torqueMax = 50;
                var opt = 0;

                if (currentBodyAngle < targetAngle) {
                    if (Math.abs(currentBodyAngle - targetAngle) < 180) {
                        //this.body.ApplyTorque(torqueRate);
                        this.body.SetAngularVelocity(torqueRate);
                        this.body.SetAngularDamping(torqueMax / 5);
                        opt = 1;
                    } else {;
                        //this.body.ApplyTorque(-torqueRate * .30);
                        this.body.SetAngularVelocity(-torqueRate);
                        this.body.SetAngularDamping(-torqueMax / 2);
                        opt = 2;
                    }
                } else {
                    if (Math.abs(currentBodyAngle - targetAngle) < 180) {
                        //this.body.ApplyTorque(-torqueRate * .30);
                        this.body.SetAngularVelocity(-torqueRate);
                        this.body.SetAngularDamping(-torqueMax / 2);
                        opt = 3;
                    } else {
                        //this.body.ApplyTorque(torqueRate);
                        this.body.SetAngularVelocity(torqueRate);
                        this.body.SetAngularDamping(torqueMax / 5);
                        opt = 4;
                    }
                }
                this.lastOptAngle = opt;

            } else {
                //Stop moving since we have target in sights
                this.body.SetAngularVelocity(0);

                //Target aquired! Do we have ammo?
                if (this.ammoCurrent <= 0 && this.reloading == false) {
                    this.reloading = true;
                    this.reloadTimer.set(this.reloadTime);
                }

                //FIRE as fast as we can
                if (this.rofTimer.complete()) {                    
                    if (this.wptype == "projectile") {
                        if (this.behavior == 2) {
                        
                            this.shoot(target);
                            this.rofTimer.reset(this.rofTime);
                            this.ammoCurrent--;
                            
                        } else {
                            this.shoot(target);
                            this.rofTimer.reset(this.rofTime);
                            this.ammoCurrent--;
                        }
                    } else if (this.wptype == "hitscan") {
                        if (this.behavior == 2) {
                        
                            this.hitscancheck(target);
                            this.rofTimer.reset(this.rofTime);
                            this.ammoCurrent--;
                            
                        } else {
                            this.hitscancheck(target);
                            this.rofTimer.reset(this.rofTime);
                            this.ammoCurrent--;
                        }
                    }
                    
                }

                //console.log("TARGET AQUIRED!");
            }
        },

        hitscancheck: function (target) {
            if (this.sound != null) {
                this.sound.play();
            }
            this.weaponstate = 'shoot';

            //copy the position data
            this.hitscan.Target = ig.copy(target.pos);
            //Start delay countdown
            this.hitscan.firedelayTimer.set(this.firedelay)
            //send to other players HUDS to start eye candy ents within HUD of incoming mortar alerts
            //var animSheet = new ig.AnimationSheet('media/mortarAlert.png', 128, 128);
            //var anim = new ig.Animation( animSheet, 0.5, [0,1,2] );
            //ig.game.hud.alerts.push({ anim: anim, pos: target.pos });

        },
        fireHitscan: function () {
            var bulletSettings = ig.game.db.projectileDbArray[this.bulletID];
            var bullet = ig.game.spawnEntity(EntityProjectile, this.hitscan.Target.x, this.hitscan.Target.y, bulletSettings);
            bullet.owner = this.owner;
            bullet.ownerRID = this.owner.remoteId;
            bullet.team = this.owner.team;
            //Send "spawnhitscan" to send the hitscan projectile
            ig.game.gamesocket.send('spawnHitScan', {
                ent: "EntityProjectile",
                x: this.hitscan.Target.x,
                y: this.hitscan.Target.y,
                bulletId: this.bulletID,
                remoteId: this.remoteId,
                team: this.team
            });
        },
        shoot: function (target) {
            if (this.sound != null) {
                this.sound.play();
            }
            this.weaponstate = 'shoot';

            //var x = Math.cos(this.owner.body.GetAngle()) * 64 + this.owner.body.GetPosition().x * Box2D.SCALE * 100;
            //var y = Math.sin(this.owner.body.GetAngle()) * 64 + this.owner.body.GetPosition().y * Box2D.SCALE * 100;
            var x = Math.cos(this.body.GetAngle()) * 32 + this.body.GetPosition().x * Box2D.SCALE * 100;
            var y = Math.sin(this.body.GetAngle()) * 32 + this.body.GetPosition().y * Box2D.SCALE * 100;
            
            //Use the database of projectile for settings later.
            var accuracy = ig.game.db.projectileDbArray[this.bulletID].accuracy;
            for (var p = 0; p < this.projectileCount; p++) {

                var bulletSettings = ig.game.db.projectileDbArray[this.bulletID];  
                //bulletSettings.accuracy = accReduct;
                //if (bulletSettings.accuracy < 0) { bulletSettings.accuracy = 0; };
                bulletSettings.categoryBits = 0x0800;
                bulletSettings.maskBits = 0xFFFF && ~0x0400 && ~0x0800; //(Collides with everything, But group -5 stuff)

                var bullet = ig.game.spawnEntity(EntityProjectile, x, y, bulletSettings);
                var fireAngle = this.body.GetAngle();
                if (accuracy != 0) {

                    fireAngle = fireAngle + ((Math.floor(Math.random() * (accuracy - (-accuracy)) + (-accuracy)))*(Math.PI/180));
                }


                var fireResult = bullet.fire(fireAngle, this.owner.remoteId, this.owner.team);//fire projectile

                //Multiplayer Transmit
                //ig.game.gamesocket.send('spawnBulletEnt', {
                //    ent: "EntityProjectile",
                //    x: x,
                //    y: y,
                //    settings: bulletSettings,
                //    angle: fireAngle,
                //    wpname: this.name,
                //    remoteId: this.owner.remoteId,
                //    team: this.owner.team
                //});
                ig.game.gamesocket.sendprojectile({
                    ent: "EntityProjectile",
                    x: x,
                    y: y,
                    settings: bulletSettings,
                    angle: fireAngle,
                    wpname: this.name,
                    remoteId: this.owner.remoteId,
                    team: this.owner.team
                });
            }
        },
        stop: function(){
            this.currentAnim = this.anims.idle;
        },
    });

})