ig.module(
	'game.entities.netplayer'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function(){
    //Other play entity that handles local display of connected players.

    //The Node server tracks all other other players and updates their positions via  game array. It also
    //updates their animations and all projectiles on the screen. This really just handles display. All the hitcode is going to be client side in this case,
    //as it is a fairly simple game. Projectiles are created and those are the things that do damage, so those are the only really serious tracking for which projectile is from which team.
    EntityNetplayer = ig.Box2DEntity.extend({
        size: {x: 128, y: 64},
        offset: {x: 0, y: 0},
        zIndex: 200,
        type: ig.Entity.TYPE.A,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!	
        density: 2,
        friction: 1,
        restitution: 0,
        active: true,
        health: { current: 9999, max: 9999 },
        armor: {
            f: { hp: 10, max: 10 },
            b: { hp: 10, max: 10 },
            r: { hp: 10, max: 10 },
            l: { hp: 10, max: 10 }
        },
        gravityFactor: 0,
        name: "netplayer",
        remoteId:0,
        //custom variables
        spawndata: { ready: false, x: 0, y: 0 },
        animSheet: new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64),
        newAngle: { update: false, angle: 0 },
        classType: "none",
        generateImpactParticle: false,
        collisiondata: {},
        //testing AI variables
        hardpoints: null,
        optics: 400, //Range of mouse move
        panrate: 20, //Rate optics pan around
        stealth: 400, //Range this tank appears on radar of other tanks
        reversespeed: .3, //Percent of forward speed tank moves in reverse
        rotationSpeed: 20, //How fast does the tank rotate/turn
        movespeed: 10, //How fast does the tank move forward?
        moveboost: 0, //How much of a boost is currently affecting the tank?
        turnRate: .5,
        movementTarget: {x:0, y:0, ready:false},
        team: 99,
        font: new ig.Font('media/04b03.font.png'),
        fontRed: new ig.Font('media/fonts/04b03_red.font.png', { borderColor: '#000', borderSize: 1 }),
        fontGreen: new ig.Font('media/fonts/04b03_green.font.png', { borderColor: '#000', borderSize: 1 }),

        categoryBits: ig.global.COL_NETPLAYER,      // collsion type NetPlayer
        maskBits: ~ig.global.COL_BULLET_NET,        // collides with localBullet
        playerName: "newbie",
        scoretrackingindex: -1,
        init: function (x, y, settings) {
            this.parent(x, y, settings);

            if (!ig.global.wm) {
                //this.body.SetFixedRotation(true);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);
                //Initial sounds of impact
                this.sounds = [soundManager.createSound({ id: 'effect_metalhit1', url: './media/sounds/metal1.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit2', url: './media/sounds/metal2.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit3', url: './media/sounds/metal3.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit4', url: './media/sounds/metal4.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit5', url: './media/sounds/metal5.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit6', url: './media/sounds/metal6.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit7', url: './media/sounds/metal7.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit8', url: './media/sounds/metal8.mp3', volume: 30 }),
                soundManager.createSound({ id: 'effect_metalhit9', url: './media/sounds/metal9.mp3', volume: 30 })]
            }
            //Setup Armor
            this.chassisArmor1 = ig.game.spawnEntity(EntityNetarmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "right", hp: this.armor.r * 100 + 100 });            
            var weldJointAr1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
            weldJointAr1.bodyA = this.body;
            weldJointAr1.bodyB = this.chassisArmor1.body;
            weldJointAr1.collideConnected = false;
            weldJointAr1.localAnchorA = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .75, 0);
            weldJointAr1.localAnchorB = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .75, -this.size.y / 2 * Box2D.SCALE - .5);
            weldJointAr1.referenceAngle = 0;
            //weldJointAr1.enableLimit = true;
            //weldJointAr1.lowerAngle = 0;
            //weldJointAr1.upperAngle = 0;
            this.chassisArmor1.weldjoin = ig.world.CreateJoint(weldJointAr1);

            this.chassisArmor2 = ig.game.spawnEntity(EntityNetarmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "left", hp: this.armor.l * 100 + 100 });
            var weldJointAr1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
            weldJointAr1.bodyA = this.body;
            weldJointAr1.bodyB = this.chassisArmor2.body;
            weldJointAr1.collideConnected = false;
            weldJointAr1.localAnchorA = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .75, 0);
            weldJointAr1.localAnchorB = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .75, this.size.y / 2 * Box2D.SCALE + .5);
            weldJointAr1.referenceAngle = 0;
            //weldJointAr1.enableLimit = true;
            //weldJointAr1.lowerAngle = 0;
            //weldJointAr1.upperAngle = 0;
            this.chassisArmor2.weldjoin = ig.world.CreateJoint(weldJointAr1);

            this.chassisArmor3 = ig.game.spawnEntity(EntityNetarmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "front", hp: this.armor.f * 100 + 100 });
            var weldJointAr1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
            weldJointAr1.bodyA = this.body;
            weldJointAr1.bodyB = this.chassisArmor3.body;
            weldJointAr1.collideConnected = false;
            weldJointAr1.localAnchorA = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .5, 0);
            weldJointAr1.localAnchorB = new Box2D.Common.Math.b2Vec2(0, 0);
            weldJointAr1.referenceAngle = 90 / 180 * Math.PI;
            //weldJointAr1.enableLimit = true;
            //weldJointAr1.lowerAngle = 0;
            //weldJointAr1.upperAngle = 0;
            this.chassisArmor3.weldjoin = ig.world.CreateJoint(weldJointAr1);

            this.chassisArmor4 = ig.game.spawnEntity(EntityNetarmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "back", hp: this.armor.b * 100 + 100 });
            var weldJointAr1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
            weldJointAr1.bodyA = this.body;
            weldJointAr1.bodyB = this.chassisArmor4.body;
            weldJointAr1.collideConnected = false;
            weldJointAr1.localAnchorA = new Box2D.Common.Math.b2Vec2(-this.size.x / 2 * Box2D.SCALE - .5, 0);
            weldJointAr1.localAnchorB = new Box2D.Common.Math.b2Vec2(0, 0);
            weldJointAr1.referenceAngle = 90 / 180 * Math.PI;
            //weldJointAr1.enableLimit = true;
            //weldJointAr1.lowerAngle = 0;
            //weldJointAr1.upperAngle = 0;
            this.chassisArmor4.weldjoin = ig.world.CreateJoint(weldJointAr1);

            this.chassisArmor1.owner = this;
            this.chassisArmor2.owner = this;
            this.chassisArmor3.owner = this;
            this.chassisArmor4.owner = this;

            //Setup Hardpoints
            for (var w = 0; w < this.hardpoints.length; w++) {
                //Make netWeapons
                this.hardpoints[w].weapon = ig.game.spawnEntity(EntityNetweapon, x, y, {wpTileSetIdle: ig.game.db.weaponDbArray[this.hardpoints[w].wpid].wpTileSetIdle, team: this.team});
                //Weld Weapons to the body.
                //var weldJointDef1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
                var weldJointDef1 = new Box2D.Dynamics.Joints.b2RevoluteJointDef();
                weldJointDef1.bodyA = this.body;
                weldJointDef1.bodyB = this.hardpoints[w].weapon.body;
                weldJointDef1.collideConnected = false;
                //Assign Hardpoint location
                var loc = { x: 0, y: 0 };
                loc = this.hardpointLocation(this.hardpoints[w].location);

                weldJointDef1.localAnchorA = new Box2D.Common.Math.b2Vec2(loc.x, loc.y);

                weldJointDef1.localAnchorB = new Box2D.Common.Math.b2Vec2(0, 0);
                weldJointDef1.referenceAngle = 0;
                if (this.hardpoints[w].arc == true) {
                    weldJointDef1.enableLimit = true;
                    weldJointDef1.lowerAngle = (-this.hardpoints[w].arcAngle).toRad();
                    weldJointDef1.upperAngle = (this.hardpoints[w].arcAngle).toRad();
                }
                //weldJointDef1.enableMotor = true;
                //weldJointDef1.maxMotorTorque = 20;
                //weldJointDef1.motorSpeed = 360 * Math.PI/180; //1 turn per second counter-clockwise
                this.hardpoints[w].weldjoin = ig.world.CreateJoint(weldJointDef1);
            }
            var classAnimIndex = (settings.classId + 1) * 9;
            this.addAnim('idle', .2, [classAnimIndex]);
            this.addAnim('idleDamaged', .2, [classAnimIndex + 3]);
            this.addAnim('idleCritical', .2, [classAnimIndex + 6]);
            this.addAnim('drive', .2, [classAnimIndex + 0, classAnimIndex + 1, classAnimIndex + 2]);
            this.addAnim('driveDamaged', .2, [classAnimIndex + 3, classAnimIndex + 4, classAnimIndex + 5]);
            this.addAnim('driveCritical', .2, [classAnimIndex + 6, classAnimIndex + 7, classAnimIndex + 8]);
            this.body.userData = "netplayer";
            this.currentAnim = this.anims.idle;
            //Attach shadow
            var settings = {
                size: { x: 1, y: 1 },
                zIndex: 180,
                animSheet: new ig.AnimationSheet('media/tankshadow.png', 128, 64),
            }
            var shadow = ig.game.spawnEntity(EntityEyecandy, ig.game.player.pos.x, ig.game.player.pos.y, settings);//
            shadow.attachTo(ig.game.player);
        },

        update: function () {
            if (this.spawndata.ready) {
                this.respawn();
            };
            if (this.active) {
                this.parent();
                //Update all animation angles to avoid jaring change
                //if (this.currentAnim == this.anims.idle) {
                this.anims.drive.angle = this.currentAnim.angle;
                this.anims.driveDamaged.angle = this.currentAnim.angle;
                this.anims.driveCritical.angle = this.currentAnim.angle;

                //} else if (this.currentAnim == this.anims.drive) {
                this.anims.idle.angle = this.currentAnim.angle;
                this.anims.idleDamaged.angle = this.currentAnim.angle;
                this.anims.idleCritical.angle = this.currentAnim.angle;

                //}
                //Update animations based on health
                if ((this.health.current / this.health.max) >= .7) {
                    this.currentAnim = this.anims.idle;
                } else if ((this.health.current / this.health.max) < .7 && (this.hp / this.maxphp) >= .3) {
                    this.currentAnim = this.anims.idleDamaged;
                } else if ((this.health.current / this.health.max) < .3 && (this.hp / this.maxphp) >= 0) {
                    this.currentAnim = this.anims.idleCritical;
                } else {
                    this.currentAnim = this.anims.idle;
                }

                if (this.newAngle.update) {
                    this.newAngle.update = false;
                    try {
                        //this.newAngle.angle = 0;

                        this.body.SetPositionAndAngle(this.body.GetPosition(), this.newAngle.angle);
                        //this.body.SetAngle(this.newAngle.angle);
                    } catch (e) {
                       //console.log("caught: " + e);
                    }

                }
                if (this.generateImpactParticle) {
                    this.generateImpactParticle = false;
                    //for (var p = 0; p < ig.global.particleCount.applied; p++) {
                    //    var randomImpulseX = Math.floor(Math.random() * (50 - (0)) + (0));
                    //    var randomImpulseY = Math.floor(Math.random() * (50 - (0)) + (0));
                    //    var particle = ig.game.spawnEntity(EntityParticle, this.pos.x, this.pos.y, { tileset: [8, 9, 10, 11] });
                    //    particle.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(randomImpulseX, randomImpulseY), particle.body.GetPosition());
                    //    particle.body.SetAngularDamping(2);
                    //    particle.body.SetLinearDamping(2);
                    //}
                }
            }
        },
        draw: function () {
            if (this.active) {
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
                    //TESTING
                    var playerAngle = Math.round(ig.game.getlimitedAngle(ig.game.player.body.GetAngle().toDeg()));
                    var netentAngle = Math.round(ig.game.getlimitedAngle(this.body.GetAngle().toDeg()));
                    var anglediff = playerAngle - netentAngle;

                    //var backMin = ig.game.getlimitedAngle(playerAngle - 45);
                    //var backMax = ig.game.getlimitedAngle(playerAngle + 45);
                    //var leftMin = ig.game.getlimitedAngle(playerAngle - 135);
                    //var leftMax = ig.game.getlimitedAngle(playerAngle - 45);
                    //var rightMin = ig.game.getlimitedAngle(playerAngle + 45);
                    //var rightMax = ig.game.getlimitedAngle(playerAngle + 135);
                    //var frontMin = ig.game.getlimitedAngle(playerAngle - 135);
                    //var frontMax = ig.game.getlimitedAngle(playerAngle + 135);
                    ////Find their angle and compare to player angle to find out which armor was hit.
                    //var collisionPoint = 'none';
                    //if (backMin < netentAngle && backMax > netentAngle) {
                    //    //If their angle is the same +/- 45 deg, then back
                    //    collisionPoint = 'back';
                    //} else if (leftMin > netentAngle && leftMax <= netentAngle) {
                    //    //If ang < -45 && ang > -135 left,
                    //    collisionPoint = 'left';
                    //} else if (rightMax > netentAngle && rightMin < netentAngle) {
                    //    //OR ang < 135 && > 45 then right
                    //    collisionPoint = 'right';
                    //} else if (frontMin > netentAngle && frontMax < netentAngle) {
                    //    //If ang < -135 && > -180 OR ang > 135 && < 180 then front
                    //    collisionPoint = 'front';
                    //}
                    //var frontRange = "b:" + frontMin + " " + frontMax;
                    //var leftRange = "l:" + leftMin + " " + leftMax;
                    //var rightRange = "r:" + rightMin + " " + rightMax;
                    //var backRange = "f:" + backMin + " " + backMax;
                    //var ranges = frontRange + " " + leftRange + " " + rightRange + " " + backRange;

                    var collisionPoint = 'none';
                    if (anglediff < -135 || anglediff > 135) {
                        //If their angle is the same +/- 45 deg, then back
                        collisionPoint = 'front';
                    } else if (anglediff > 45 && anglediff <= 135) {
                        //If ang < -45 && ang > -135 left,
                        collisionPoint = 'left';
                    } else if (anglediff > -135 && anglediff <= -45) {
                        //OR ang < 135 && > 45 then right
                        collisionPoint = 'right';
                    } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
                        //If ang < -135 && > -180 OR ang > 135 && < 180 then front
                        collisionPoint = 'back';
                    }
                    

                    //TESTING
                    if (this.team == ig.game.player.team) {
                        //this.fontGreen.draw(this.playerName + " " + collisionPoint + " p:" + playerAngle + " n:" + netentAngle + " " + anglediff, this.pos.x - ig.game.screen.x + 64, this.pos.y - ig.game.screen.y - 24, ig.Font.ALIGN.CENTER);
                        this.fontGreen.draw(this.playerName, this.pos.x - ig.game.screen.x + 64, this.pos.y - ig.game.screen.y - 32, ig.Font.ALIGN.CENTER);
                    } else {
                        //this.fontRed.draw(this.playerName + " " + collisionPoint + " p:" + playerAngle + " n:" + netentAngle + " " + anglediff, this.pos.x - ig.game.screen.x + 64, this.pos.y - ig.game.screen.y - 24, ig.Font.ALIGN.CENTER);
                        this.fontRed.draw(this.playerName, this.pos.x - ig.game.screen.x + 64, this.pos.y - ig.game.screen.y - 32, ig.Font.ALIGN.CENTER);
                    }
                    ig.system.context.fillStyle = "rgba(5,5,5, .2)";
                    ig.system.context.fillRect((this.pos.x - ig.game.screen.x - 16) * ig.system.scale, (this.pos.y - ig.game.screen.y - 16) * ig.system.scale, 128 * ig.system.scale, 1 * ig.system.scale);

                    ig.system.context.fillStyle = "rgba(50, 240, 50, .8)";
                    ig.system.context.fillRect((this.pos.x - ig.game.screen.x - 16)*ig.system.scale, (this.pos.y - ig.game.screen.y - 16)*ig.system.scale, Math.round(128 * (this.health.current / this.health.max)) * ig.system.scale, 1 * ig.system.scale);

                    //draw armor scores

                } else {
                    //this.font.draw(this.distanceTo(ig.game.player) + ";" + ig.game.player.optics, this.pos.x - ig.game.screen.x - 16, this.pos.y - ig.game.screen.y - 16);
                }
            }
        },
        hurt: function () {
            if (this.generateImpactParticle == false) {
                this.generateImpactParticle = true;

                var randomSoundIndex = Math.floor(Math.random() * (50 - (0)) + (0));
                if (randomSoundIndex < 9) {
                    this.sounds[randomSoundIndex].play();
                }
            }
        },
        setCollisionData: function(data){
            this.collisiondata = data;
        },
        death: function () {
            for (var d = 0; d < this.hardpoints.length; d++) {
                this.hardpoints[d].weapon.kill();
            }
            this.chassisArmor1.kill();
            this.chassisArmor2.kill();
            this.chassisArmor3.kill();
            this.chassisArmor4.kill();
            this.kill();
            //"Kill" this Netplaye by setting its part to inactive and moving it off the board.
            //console.log("Running Kill on Netplayer");
            //this.active = false;
            //this.pos = { x: -1000, y: -1000 };
            //this.body.SetPosition(new Box2D.Common.Math.b2Vec2(this.pos.x * Box2D.SCALE, this.pos.y * Box2D.SCALE));
            //this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
            //this.body.SetAngularVelocity(0);
            //this.body.SetAngle(0);
            //this.body.SetAwake(true);
            ////Deactivate Hardpoints to remove Draw/Update
            //for (var d = 0; d < this.hardpoints.length; d++) {
            //    this.hardpoints[d].weapon.active = false;
            //}
        },
        spawn: function (x, y) {
            this.spawndata.ready = true;
            this.spawndata.x = x;
            this.spawndata.y = y;

        },
        respawn: function () {
           //console.log("Running respawn on Netplayer");
            this.spawndata.ready = false;
            //Need respawn zones. Respawn zones should offer passive armor and hull regen to any friendly in them.
            this.active = true;
            this.body.SetAwake(false);
            this.pos = { x: this.spawndata.x, y: this.spawndata.y };
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2((this.spawndata.x - this.size.x / 2) * Box2D.SCALE, (this.spawndata.y - this.size.y / 2) * Box2D.SCALE));
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
            this.body.SetAngularVelocity(0);
            this.body.SetAngle(0);
            //Active Hardpoints to remove Draw/Update
            for (var d = 0; d < this.hardpoints.length; d++) {
                this.hardpoints[d].weapon.active = true;
            }
        },
        SetNewAngle: function (angle) {
            this.newAngle = { update: true, angle: angle };
        },
        hardpointLocation: function (locationString) {
            //1- Front-left, 2 Front-Center, 3 Front-Right, 4, Right-Front, 5 Left-Front
            //6 Center, 7 Right-Back, 8 Left-Back, 9 Back-Left, 10 Back-Center, 11 Back-Right
            if (locationString === "chassisFC") {
                return { x: this.size.x / 2 * Box2D.SCALE - .52, y: 0 };
            } else if (locationString === "chassisFR") {
                return { x: this.size.x / 2 * Box2D.SCALE - .52, y: this.size.y / 2 * Box2D.SCALE - .42 };
            } else if (locationString === "chassisFL") {
                return { x: this.size.x / 2 * Box2D.SCALE - .52, y: -(this.size.y / 2 * Box2D.SCALE - .42) };
            } else if (locationString === "chassisRF") {
                return { x: this.size.x * 3 / 4 * Box2D.SCALE - 7.5, y: this.size.y / 2 * Box2D.SCALE - .24 };
            } else if (locationString === "chassisRB") {
                return { x: -(this.size.x * 3 / 4 * Box2D.SCALE - 8.5), y: this.size.y / 2 * Box2D.SCALE - .24 };
            } else if (locationString === "chassisLF") {
                return { x: this.size.x * 3 / 4 * Box2D.SCALE - 7.5, y: -(this.size.y / 2 * Box2D.SCALE - .24) };
            } else if (locationString === "chassisLB") {
                return { x: -(this.size.x * 3 / 4 * Box2D.SCALE - 8.5), y: -(this.size.y / 2 * Box2D.SCALE - .24) };
            } else if (locationString === "chassisBR") {
                return { x: -(this.size.x / 2 * Box2D.SCALE + .52) + 3, y: this.size.y / 2 * Box2D.SCALE - .42 };
            } else if (locationString === "chassisBC") {
                return { x: -(this.size.x / 2 * Box2D.SCALE + .52) + 3, y: 0 };
            } else if (locationString === "chassisBL") {
                return { x: -(this.size.x / 2 * Box2D.SCALE + .52) + 3, y: -(this.size.y / 2 * Box2D.SCALE - .42) };//Was + 1.50, then 1.25
            } else if (locationString === "chassisC") {
                return { x: 0, y: 0 };
            } else {
                return { x: 0, y: 0 };
            }
        },

    });

});