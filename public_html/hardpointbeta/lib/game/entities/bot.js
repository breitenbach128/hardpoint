ig.module(
	'game.entities.bot'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityBot = ig.Box2DEntity.extend({
        size: { x: 128, y: 64 },
        //offset: {x: 4, y: 2},
        zIndex: 200,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        density: 2,
        friction: 1,
        restitution: 0,
        health: 5,
        gravityFactor: 0,
        name: "bot",
        //Custom
        botName: "newbie",
        spawn: { ready: false, x: 0, y: 0 },
        setchassisPos: { ready: false, b2vec: null },
        entityType: "bot",
        handlesInput: true,
        remoteId: 0,
        active: false,
        botClass: -1,
        classType: "none",
        hp: 500,
        maxphp: 500,
        respawnBonus: 0,
        armor: { f: 0, l: 0, r: 0, b: 0 },
        optics: 100, //Range of mouse move
        panrate: 20, //Rate optics pan around
        stealth: 400, //Range this tank appears on radar of other tanks
        reversespeed: .3, //Percent of forward speed tank moves in reverse
        rotationSpeed: 20, //How fast does the tank rotate/turn
        movespeed: 10, //How fast does the tank move forward?
        moveboost: 0, //How much of a boost is currently affecting the tank?
        turnRate: .5,
        collisionFriction: new Array(),//Directions will contain the netplayerId and the armor position and reduction
        collisionTracker: new Array(),
        animSheet: null,
        flip: false,
        destination: { move: false, x: 0, y: 0, currentAngle: 0, targetAngle: 0 },
        engineStarted: false,
        initialAngle: { enabled: false, angle: Math.PI, c: 0 },
        //Combat
        inCover: false,
        points: 0,
        team: 0,//0 means unassigned, 1 for testing
        flagheld: false,
        //Weapons - These will be taken from the weapon later
        rateOfFire: 15,//Every 15 frames
        rateOfFireCount: 0,
        hardpoints: [{ wpid: 4, location: (0, 0), arc: true, arcAngle: 45, weapon: null, weldjoin: null }],
        weaponSlot1: null,
        weaponSlot2: null,
        abilitySlot1: { status: 'inactive', ability: null },
        weaponSelected: 0,
        //PerkInfo
        regen: 0,
        heroic: false,
        deathEffect: 'none',
        performDeathEffect: false,
        //effects
        statusEffects: new Array(),
        statusEffectsPrevStats: new Array(),
        statusEffectTimer: null,
        //Perk effects
        hasTriage: false,
        hasDefenseDrone: false,
        defenseDroneEnt: null,
        defenseDroneSpawnReady: false,
        // Load a font
        //Scoring
        scoreTrackingPerLife: { damageSources: new Array() },
        scoretrackingindex: -1,
        font: new ig.Font('media/04b03.font.png'),
        fontborder: new ig.Font('media/04b03.font.png', { borderColor: '#000', borderSize: 1 }),
        //AI for bot
        ai: {behavior:"none", trgbehavior: "none", atkbehavior:"none", killcount: 0, deathcount:0, movetargets: new Array(), attacktarget: null, trgIndex: 0},
        //Collision Filtering
        categoryBits: ig.global.COL_BOT,      // Is a type BOT
        maskBits: ~ig.global.COL_BOT_WEAPON,        // Does not collide with BOT weapon
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.botName = "bot_" + Math.round(Math.random() * 10000);

            this.mpUpdateTimer = new ig.Frametimer(0, 5);

            //Check status effects
            this.statusEffectTimer = new ig.Timer(1);

            //Bot path timer
            this.botpathtimer = new ig.Timer(1);

            //bot respawn timer
            this.botRespawnTimer = new ig.Timer(10);
            this.botRespawnTimer.pause();

            //class spawn sheet
            this.animSheet = new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64);
            //Ability
            this.abilitySlot1 = new ability(ig.game.db.abilityArray[settings.classid]);
            //hardpoints
            this.hardpoints = ig.game.db.classDbArray[settings.classid].hardpoints;

            //Joint types: b2WeldJointDef , b2DistanceJointDef, b2RevoluteJointDef
            //Setup Armor
            this.chassisArmor1 = ig.game.spawnEntity(EntityBotarmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "right", hp: this.armor.r * 100 + 100, owner: this });
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

            this.chassisArmor2 = ig.game.spawnEntity(EntityBotarmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "left", hp: this.armor.l * 100 + 100, owner: this });
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

            this.chassisArmor3 = ig.game.spawnEntity(EntityBotarmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "front", hp: this.armor.f * 100 + 100, owner: this });
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

            this.chassisArmor4 = ig.game.spawnEntity(EntityBotarmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "back", hp: this.armor.b * 100 + 100, owner: this });
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
            //********************************
            //Setup weapons
            for (var w = 0; w < this.hardpoints.length; w++) {
                //Make Weapon
                this.hardpoints[w].weapon = ig.game.spawnEntity(EntityBotweapon, x, y, ig.game.db.weaponDbArray[this.hardpoints[w].wpid]);
                this.hardpoints[w].weapon.owner = this;
                this.hardpoints[w].weapon.equipped = true;
                this.hardpoints[w].weapon.group = this.hardpoints[w].group;
                this.hardpoints[w].weapon.setIndexId(w);
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
                weldJointDef1.referenceAngle = this.hardpoints[w].referenceAngle;
                if (this.hardpoints[w].arc == true) {
                    weldJointDef1.enableLimit = true;
                    this.hardpoints[w].weapon.arclimit = true;
                    if (this.hardpoints[w].arcAngle < 0) {
                        var startAngle = this.hardpoints[w].arcAngle * -1;//Make it positive
                        var angleRange = (180 - startAngle) * 2;
                        this.hardpoints[w].weapon.lowerlimit = (startAngle);
                        this.hardpoints[w].weapon.upperlimit = (startAngle + angleRange);

                        //console.log("Angle Range: FROM: " + (startAngle) + " TO: " + (startAngle + angleRange))
                        weldJointDef1.lowerAngle = (startAngle).toRad();
                        weldJointDef1.upperAngle = (startAngle + angleRange).toRad();
                    } else {
                        this.hardpoints[w].weapon.lowerlimit = (-this.hardpoints[w].arcAngle);
                        this.hardpoints[w].weapon.upperlimit = (this.hardpoints[w].arcAngle);
                        //console.log("Angle Range: FROM: " + (this.hardpoints[w].arcAngle * -1) + " TO: " + this.hardpoints[w].arcAngle)
                        weldJointDef1.lowerAngle = (-this.hardpoints[w].arcAngle).toRad();
                        weldJointDef1.upperAngle = (this.hardpoints[w].arcAngle).toRad();
                    }

                }
                //weldJointDef1.enableMotor = true;
                //weldJointDef1.maxMotorTorque = 20;
                //weldJointDef1.motorSpeed = 360 * Math.PI/180; //1 turn per second counter-clockwise
                this.hardpoints[w].weldjoin = ig.world.CreateJoint(weldJointDef1);

            }
            //Set armor ownership
            this.chassisArmor1.owner = this;
            this.chassisArmor2.owner = this;
            this.chassisArmor3.owner = this;
            this.chassisArmor4.owner = this;
            //Bind armor to hardpoints by position
            this.chassisArmor1.setupArmorToHPxRef();
            this.chassisArmor2.setupArmorToHPxRef();
            this.chassisArmor3.setupArmorToHPxRef();
            this.chassisArmor4.setupArmorToHPxRef();
            //Setup Animations
            var classAnimIndex = (settings.classid + 1) * 9;
            this.addAnim('idle', .2, [classAnimIndex]);
            this.addAnim('idleDamaged', .2, [classAnimIndex + 3]);
            this.addAnim('idleCritical', .2, [classAnimIndex + 6]);
            this.addAnim('drive', .2, [classAnimIndex + 0, classAnimIndex + 1, classAnimIndex + 2]);
            this.addAnim('driveDamaged', .2, [classAnimIndex + 3, classAnimIndex + 4, classAnimIndex + 5]);
            this.addAnim('driveCritical', .2, [classAnimIndex + 6, classAnimIndex + 7, classAnimIndex + 8]);
            this.currentAnim = this.anims.idle;
            //console.log("box2D test: " + this.body.GetFixtureList().GetFriction());
            this.botClass = settings.classid;

            if (!ig.global.wm) {
                //this.body.SetFixedRotation(true);
                this.body.userData = "bot";

                //Make active
                this.active = true;
                this.remoteAnim = "idle";
                //Set filters for collision

                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                //newFilterData.groupIndex = -5;// Bot Stuff
                this.body.GetFixtureList().SetFilterData(newFilterData);
                this.body.SetAngularDamping(.5);

                //Dampening (linear and angular)
                this.body.SetLinearDamping(3);//3

                //Create sounds
                this.drivingsound = soundManager.createSound({ id: 'player_drive', url: './media/sounds/Tank_Running.wav', volume: 50 });
                this.enginestartsound = soundManager.createSound({ id: 'player_enginestart', url: './media/sounds/Tank_Startup.wav', volume: 50 });
                this.drivingsoundlong = soundManager.createSound({ id: 'player_drivelong', url: './media/sounds/Tank_Running_Grity_Long.wav', volume: 50 });
	            // //Set initial remote ID
                // var currentbots = ig.game.getEntitiesByType(EntityBot);
                // this.remoteId = "bot0" + currentbots.length;
            }

            //apply perks
            this.applyPerks();
            //Set max HP
            this.maxhp = this.hp;

            //Apply shadow
            var settings = {
                zIndex: 180,
                size: { x: 1, y: 1 },
                animSheet: new ig.AnimationSheet('media/tankshadow.png', 128, 64),
            }
            var shadow = ig.game.spawnEntity(EntityEyecandy, this.pos.x, this.pos.y, settings);//
            shadow.attachTo(this);


        },


        update: function () {
            //For bot respawns
            if (!this.active && ig.game.startGame == true) {
                if (this.botRespawnTimer.delta() >= 0) {
                    this.botRespawnTimer.reset();
                    this.botRespawnTimer.pause();
                    //Respawn
                    if (this.team == 2) {
                        var zone = ig.game.getEntityByName('team2spawn');
                    } else {
                        var zone = ig.game.getEntityByName('team1spawn');
                    };
                    var randOffsetX = Math.round(Math.random() * (16 - (-16)) + (-16));
                    var randOffsetY = Math.round(Math.random() * (16 - (-16)) + (-16));
                    this.configspawn(zone.pos.x + (zone.size.x / 2) + randOffsetX, zone.pos.y + (zone.size.y / 2) + randOffsetY);
                }
            }
            

            if (ig.game.startGame == true) {
                if (this.spawn.ready) {
                    this.respawn();
                    console.log("spawn bot", this.botName, this.pos);
                };
                //Only perform actions if the local player is the host
                if (ig.global.playerIsHost == true) {
                    //Is alive and active?
                    if (this.active) {
                        this.parent();

                        //Run AI Behavior
                        this.aiBehavior();
                        
                        if (this.initialAngle.enabled && this.initialAngle.c < 10) {
                            //console.log(JSON.stringify(this.initialAngle));
                            if ((Math.round(this.body.GetAngle() * 100) / 100) != (Math.round(this.initialAngle.angle * 100) / 100)) {

                                this.body.SetAngle(this.initialAngle.angle);
                            } else {
                                this.initialAngle.c++;
                            }
                            if (this.initialAngle.c >= 10) {
                                this.initialAngle.enabled = false;
                                this.initialAngle.c = 0;
                            }
                        }

                        //Is the position being manuall set for the whole chassis?
                        if (this.setchassisPos.ready) {
                            this.chassisSetPosition(this.setchassisPos.b2vec);
                        }
                        //Check Collision effects
                        this.runTankCollisionEffects();
                        //Is ability active?
                        if (this.abilitySlot1.passive.enabled) {
                            if (this.abilitySlot1.passiveTimer.delta() >= 0) {
                                this.abilitySlot1.applyPassive();
                                this.abilitySlot1.passiveTimer.reset();
                            }
                        }
                        if (this.abilitySlot1.ready == false) {
                            if (this.abilitySlot1.cdtimer.delta() >= 0) {
                                this.abilitySlot1.resetAbility();
                            }
                            if (this.abilitySlot1.active == true) {
                                
                                if (this.abilitySlot1.occurence.type == 'reccuring') {
                                    if (this.abilitySlot1.effTimer.delta() >= 0) {
                                        //Trigger effect tick
                                        this.abilitySlot1.triggerPersistance();
                                    }
                                } else if (this.abilitySlot1.occurence.type == 'triggered') {
                                    if (this.abilitySlot1.effTimer.delta() >= 0) {
                                        console.log("triggered ability timer complete");
                                        //remove, since it has expired
                                        this.abilitySlot1.removeAbility();
                                    }
                                }
                            }
                        }
                        //Check triage and triage effect
                        if (this.hasTriage) {
                            if (this.triageTimer.delta() >= 0) {
                                this.triageTimer.reset();
                                var settings = {
                                    effectType: 'regen',
                                    effectTime: 30,
                                    lifespan: 10,
                                    tileset: [0, 1, 2, 3, 4, 5, 6, 7],
                                }
                                //These origin points (pos.x, pos.y) need to be set to the center point.
                                var xpos = this.pos.x + (this.size.x / 2) + Math.cos(this.body.GetAngle() + Math.PI) * 128;//64 distance
                                var ypos = this.pos.y + (this.size.y / 2) + Math.sin(this.body.GetAngle() + Math.PI) * 128;//64 distance

                                ig.game.spawnEntity(EntityPowerup, xpos, ypos, settings);
                                //Netspawn powerup
                                ig.game.gamesocket.send('spawnSimpleEntity', { ent: 'EntityPowerup', x: xpos, y: ypos, settings: settings });

                            }
                        }

                        //Is death effect needed?
                        if (this.performDeathEffect) {
                            this.performDeathEffect = false;
                            this.effect(this.deathEffect);
                        }


                        //Do status effects if needed
                        if (this.statusEffects.length > 0) {
                            if (this.statusEffectTimer.delta() >= 0) {
                                var tempStatusArr = new Array();
                                //reduce all effect time stacks by one. If zero, remove.
                                for (var e = 0; e < this.statusEffects.length; e++) {
                                    //Reduce stack timer count
                                    this.statusEffects[e].stack--;
                                    //Complete effect
                                    //All allow items set to reapply to apply more than 1 stack, otherwise, just apply the one time. Powerups tend to reapply for regen
                                    if (this.statusEffects[e].reapply == true || (this.statusEffects[e].stack == (this.statusEffects[e].stackmax - 1))) {
                                        if (this.statusEffects[e].name == 'regen') {
                                            if (this.hp < this.maxphp) {
                                                this.hp = this.hp + this.statusEffects[e].value;
                                            }
                                        } else if (this.statusEffects[e].name == 'movement') {

                                            this.moveboost = (this.moveboost / 2) + this.statusEffects[e].value * 2;

                                        } else if (this.statusEffects[e].name == 'armor') {
                                            if (this.chassisArmor1.hp < this.chassisArmor1.maxhp) {
                                                this.chassisArmor1.hp = this.chassisArmor1.hp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor2.hp < this.chassisArmor2.maxhp) {
                                                this.chassisArmor2.hp = this.chassisArmor2.hp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor3.hp < this.chassisArmor3.maxhp) {
                                                this.chassisArmor3.hp = this.chassisArmor3.hp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor4.hp < this.chassisArmor4.maxhp) {
                                                this.chassisArmor4.hp = this.chassisArmor4.hp + this.statusEffects[e].value;
                                            }
                                        } else if (this.statusEffects[e].name == 'morale') {
                                            if (this.chassisArmor1.mp < 100) {
                                                this.chassisArmor1.mp = this.chassisArmor1.mp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor2.mp < 100) {
                                                this.chassisArmor2.mp = this.chassisArmor2.mp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor3.mp < 100) {
                                                this.chassisArmor3.mp = this.chassisArmor3.mp + this.statusEffects[e].value;
                                            }
                                            if (this.chassisArmor4.mp < 100) {
                                                this.chassisArmor4.mp = this.chassisArmor4.mp + this.statusEffects[e].value;
                                            }
                                        } else if (this.statusEffects[e].name == 'weapon-rof') {
                                            var wpOldData = new Array();
                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                wpOldData.push(this.hardpoints[d].weapon.rofTime);
                                                this.hardpoints[d].weapon.rofTime = Math.round(this.hardpoints[d].weapon.rofTime * this.statusEffects[e].value);
                                                if (this.hardpoints[d].weapon.rofTime < 3) { this.hardpoints[d].weapon.rofTime = 3; };
                                            }
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: wpOldData });
                                        } else if (this.statusEffects[e].name == 'weapon-reload') {
                                            var wpOldData = new Array();

                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                wpOldData.push(this.hardpoints[d].weapon.reloadTime)
                                                this.hardpoints[d].weapon.reloadTime = Math.round(this.hardpoints[d].weapon.reloadTime * this.statusEffects[e].value);
                                                if (this.hardpoints[d].weapon.reloadTime < 1) { this.hardpoints[d].weapon.reloadTime = 1; };
                                                //Reset Reload timer
                                                this.hardpoints[d].weapon.reloadTimer.set(this.hardpoints[d].weapon.reloadTime);
                                                this.hardpoints[d].weapon.reloadTimer.pause();
                                            }
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: wpOldData });
                                        } else if (this.statusEffects[e].name == 'weapon-magsize') {
                                            //ammoMax
                                            var wpOldData = new Array();

                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                wpOldData.push(this.hardpoints[d].weapon.ammoMax)
                                                this.hardpoints[d].weapon.ammoMax = Math.round(this.hardpoints[d].weapon.ammoMax * this.statusEffects[e].value);
                                            }
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: wpOldData });
                                        } else if (this.statusEffects[e].name == 'slowpercent') {
                                            //slow down?	                                    
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: this.movespeed });
                                            this.movespeed = this.movespeed / this.statusEffects[e].value;
                                        } else if (this.statusEffects[e].name == 'blind') {
                                            //blind	  
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: this.optics });
                                            this.optics = this.statusEffects[e].value;
                                        } else {
                                            //Save the old stat for later reapplication
                                            this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: this[this.statusEffects[e].name] });
                                            //A direct stat modification, so just call it by its own name
                                            this[this.statusEffects[e].name] = this.statusEffects[e].value;

                                            //console.log('status effect apply, setting  value', this.statusEffects[e].value)
                                        }
                                    }
                                    //remove any expired effects, this can be done by only pushing > 0 stacks into a temp array, clearing the old one and then copying.
                                    if (this.statusEffects[e].stack > 0) {
                                        tempStatusArr.push(this.statusEffects[e]);
                                    } else {
                                        //console.log("Effects remaining:", this.statusEffects[e]);
                                        //reset applicable effects back to normal
                                        if (this.statusEffects[e].name == 'movement') {
                                            this.moveboost = 0;
                                        } else if (this.statusEffects[e].name == 'weapon-rof') {
                                            var restoreArray = this.getOldStatusData(this.statusEffects[e].name)
                                            //console.log("Effects old stats:", restoreArray);
                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                this.hardpoints[d].weapon.rofTime = restoreArray[d];
                                            }
                                        } else if (this.statusEffects[e].name == 'weapon-reload') {
                                            var restoreArray = this.getOldStatusData(this.statusEffects[e].name)
                                            //console.log("Effects old stats:", restoreArray);
                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                this.hardpoints[d].weapon.reloadTime = restoreArray[d];
                                                //Reset Reload timer
                                                this.hardpoints[d].weapon.reloadTimer.set(this.hardpoints[d].weapon.reloadTime);
                                                //this.hardpoints[d].weapon.reloadTimer.pause();
                                            }
                                        } else if (this.statusEffects[e].name == 'weapon-magsize') {
                                            var restoreArray = this.getOldStatusData(this.statusEffects[e].name)
                                            //console.log("Effects old stats:", restoreArray);
                                            for (var d = 0; d < this.hardpoints.length; d++) {
                                                this.hardpoints[d].weapon.ammoMax = restoreArray[d];
                                                this.hardpoints[d].weapon.ammoCurrent = restoreArray[d];
                                            }
                                        } else if (this.statusEffects[e].name == 'slowpercent') {
                                            this.movespeed = this.getOldStatusData(this.statusEffects[e].name);
                                        } else if (this.statusEffects[e].name == 'blind') {
                                            this.optics = this.getOldStatusData(this.statusEffects[e].name);
                                        } else {
                                            this[this.statusEffects[e].name] = this.getOldStatusData(this.statusEffects[e].name);

                                        }
                                    }
                                }
                                this.statusEffects = [];
                                this.statusEffects.length = 0;
                                this.statusEffects = tempStatusArr;
                                //this.statusEffectTimer.set(1);

                            }
                        }

                        //Check for defense drone spawner
                        if (this.defenseDroneSpawnReady) {
                            this.defenseDroneSpawnReady = false;
                            var settings = { team: this.team, isNetClone: false, animations: { idle: [8], firing: [8, 9, 10], bulletID: 2, rof: 1, lifespan: 5 } };

                            //get Angle adjustment

                            //Add vectors to get correction / or Generate velocities (math pi is 1/2 of a circle)
                            var xpos = this.chassisArmor4.pos.x + (this.chassisArmor4.size.x / 2) + Math.cos(this.body.GetAngle() + Math.PI) * 64;//64 distance
                            var ypos = this.chassisArmor4.pos.y + (this.chassisArmor4.size.y / 2) + Math.sin(this.body.GetAngle() + Math.PI) * 64;//64 distance


                            //chassisArmor4 = back armor
                            this.defenseDroneEnt = ig.game.spawnEntity(EntityTurret, xpos, ypos, settings);

                            //Spawn a copy via a network broadcast
                            ig.game.gamesocket.send('spawnTurret', {
                                box2dpos: { x: ((xpos) * Box2D.SCALE), y: ((ypos) * Box2D.SCALE) },
                                settings: settings,
                                remoteId: this.remoteId,
                                team: this.team
                            });
                        }

                        //Update status timer to ensure 1 second ticks
                        if (this.statusEffectTimer.delta() >= 0) {
                            this.statusEffectTimer.set(1);
                        }

                        if (this.regen > 0) {
                            if (this.regenTimer.delta() >= 0) {
                                this.regenTimer.reset();
                                this.hp = this.hp + this.regen;
                                if (this.hp > this.maxphp) { this.hp = this.maxphp };
                            }
                        }

                    }//END OF ACTIVE CHECK


                } else {
                    //Handle network player effects and updates.

                }
            }
        },
        chooseRandomBehavior: function(isNew){
            var behaviors =  ["aggressive","defensive","objective","waypoints"];
            
            if(isNew){//Should the new behavior selection list NOT include the current behavior?
                var n= -1;
                for(var b=0;b<behaviors.length;b++){
                    if(behaviors[b] == this.ai.behavior){n = b;};
                }

                if(n!=-1){behaviors.splice(n,1);};
            }

            var newChoice = behaviors[Math.floor(Math.random() * (behaviors.length - (-0)) + (-0))];
            console.log("new Rand Behavior",newChoice);
            return newChoice
        },
        flipCoin: function(c1,c2){
            var choice = Math.floor(Math.random());
            var selection = c1;
            if(choice >- .5){
                selection = c1;
            }else{
                selection = c2;
            }
            return selection;
        },
        chooseNewMovementTarget: function(){
            //Get all entities to select from
            var allents = new Array();
            allents.push(ig.game.player);
            var netents = ig.game.getEntitiesByType(EntityNetplayer);
            for(var p =0;p<netents.length;p++){
                allents.push(netents[p]);
            }
            var objectives = ig.game.getEntitiesByType(EntityObjective);
            //Now. There are  deciding factors to the new movement target. I need an equation to calculate these values and then decide.
            //It will get a list of them, sort them by value of the equation, and then pick a random one of the top 3. (up to)
            var targetlisting = new Array();
            var score = 0;
            console.log("Current Behavior:", this.ai.behavior);
            if(this.ai.behavior == "aggressive"){
                console.log("SetMovetarget: behavior == aggressive");
                //AGGRESSIVE
                //How weak is the target, hp?
                //How close is the target?
                //How close is the target to the objective and HOW many points does the team have?
                //What type of chassis is the target compared to me?
                
                for(var e=0;e<allents.length;e++){
                    if(this.team != allents[e].team){
                        score = 0;
                        score += (allents[e].health.current / allents[e].health.max) * 1000;
                        score += (10000 - allents[e].distanceTo(this));
                        score += (10000 -allents[e].distanceTo(objectives[0]));
                        // if(this.classId == 1 || this.classId == 2 || this.classId == 6  || this.classId == 8 ){
                            
                        // }else if(this.classId == 3 || this.classId == 7  || this.classId == 9 ){

                        // }else if(this.classId == 4 || this.classId == 5 ){

                        // }

                        //Push into target listing
                        if(targetlisting[0] == undefined){
                            targetlisting.push({score: score, ent: allents[e]});
                        }else{
                            if(targetlisting[0].score > score){
                                targetlisting.push({score: score, ent: allents[e]});
                            }else{
                                targetlisting.shift({score: score, ent: allents[e]});
                            }
                        }
                    }
                }
                console.log("SetMovetarget:", targetlisting.length );
                if(targetlisting.length > 0){
                    var choice = 3;
                    if(targetlisting.length < 3){
                        choice = targetlisting.length;
                    }
                    //NEW MOVEMENT TARGET
                    this.ai.movetargets =  [targetlisting[Math.floor(Math.random() * (choice - (-0)) + (-0))].ent];
                    console.log("SetMovetarget: LENGTH", this.ai.movetargets.length );
                }else{
                    //No allies to target, so switch to objective
                    this.ai.behavior = this.chooseRandomBehavior(true);                    
                    this.chooseNewMovementTarget();
                }
            }else if(this.ai.behavior == "defensive"){
                //DEFENSIVE
                //How low is the teammates health?
                //How close is the teammate?
                for(var e=0;e<allents.length;e++){
                    if(this.team == allents[e].team){
                        score = 0;
                        score += (allents[e].health.current / allents[e].health.max) * 1000;
                        score += (10000 - allents[e].distanceTo(this));

                        if(targetlisting[0] == undefined){
                            targetlisting.push({score: score, ent: allents[e]});
                        }else{
                            if(targetlisting[0].score > score){
                                targetlisting.push({score: score, ent: allents[e]});
                            }else{
                                targetlisting.shift({score: score, ent: allents[e]});
                            }
                        }
                    }
                }
                if(targetlisting.length > 0){
                    var choice = 3;
                    if(targetlisting.length < 3){
                        choice = targetlisting.length;
                    }
                    //NEW MOVEMENT TARGET
                    this.ai.movetargets =  [targetlisting[Math.floor(Math.random() * (choice - (-0)) + (-0))].ent];
                }else{
                    //No allies to target, so switch to objective
                    this.ai.behavior = this.chooseRandomBehavior(true);
                    this.chooseNewMovementTarget();
                }
            }else if(this.ai.behavior == "objective"){                
                console.log("choose mv trgs for objective behavior.");
                //OBJECTIVE - Always move to objective
                this.ai.movetargets =  objectives;
                this.path = null; //Reset path
                for(var e=0;e<this.ai.movetargets.length;e++){
                    console.log("targets include", this.ai.movetargets[e].name);
                }
            }else if(this.ai.behavior == "waypoints"){
                console.log("choose mv trg for waypoint behavior.");
                //Waypoint - Random
                var ainodes = ig.game.getEntitiesByType(EntityAinode);
                for(var e=0;e<ainodes.length;e++){
                    targetlisting.push({score: 0, ent: ainodes[e]});
                }
                //Remvoe down to 3 choices
                while(targetlisting.length > 3){
                    var s = Math.floor(Math.random() * (targetlisting.length - (-0)) + (-0));
                    console.log("selecting wp nodeid", targetlisting[s].ent.nodeid);
                    targetlisting.splice(s,1);
                }
                //Push just the ents only into a temp listing
                var newtargetlist = new Array();
                for(var e=0;e<targetlisting.length;e++){
                    newtargetlist.push(targetlisting[e].ent)
                }
                //NEW MOVEMENT TARGET
                this.ai.movetargets =  newtargetlist;
            }


        },
        aiBehaviorChanger: function(){

            if(this.ai.behavior == "none"){
                this.ai.behavior = this.chooseRandomBehavior(false);
                this.chooseNewMovementTarget();
            }else{
                //If the team has a score > 3 ahead of this team, set to objective behavior to defend the objective
                var objectives = ig.game.getEntitiesByType(EntityObjective);

                var t1p = 0;
                var t2p = 0;
                for(var o=0;o<objectives.length;o++){
                    t1p+= objectives[o].team1Points;
                    t2p+= objectives[o].team2Points;
                }
                if(this.team == 1 && t2p > t1p + 3){
                    this.ai.behavior = "objective";
                    //New target
                    this.chooseNewMovementTarget();
                }else if(this.team == 2 && t1p > t2p + 3){
                    this.ai.behavior = "objective";
                    //New target
                    this.chooseNewMovementTarget();
                }

                var makeBehaviorChange = false;
                if(this.ai.behavior == "aggressive" && ((this.ai.killcount + 2) < this.ai.deathcount)){
                    makeBehaviorChange = true;
                }
                //If aggressive and have died more than killed + 2, roll chance. 
                //50% change target, 50% chance behavior

                if(this.ai.behavior == "defensive" && ((this.ai.killcount + 2) < this.ai.deathcount)){
                    makeBehaviorChange = true;
                }
                //If defensive and have died more than killed + 2, roll chance
                //50% change target, 50% change behavior

                //If waypoint patrol, and died once, set to 50% aggress / 50% defensive chance and roll.
                if(this.ai.behavior == "waypoint" && ((this.ai.killcount + 2) < this.ai.deathcount)){
                    makeBehaviorChange = true;
                }

                if(makeBehaviorChange){
                //Reset counts for tracking
                    this.resetAiCounts();
                //On change behavior, set to different behavior
                    var choice = this.flipCoin("newtarget", "newbehavior");
                    console.log("chose", choice);
                    if(choice == 'newtarget'){
                        //Just new target
                        this.chooseNewMovementTarget();
                    }else{
                        this.ai.behavior = this.chooseRandomBehavior(true);
                        //And new target
                        this.chooseNewMovementTarget();
                    }
                }
            }

        },
        resetAiCounts: function(){
            this.ai.killcount = 0;
            this.ai.deathcount = 0;
        },
        aiBehavior: function(){
            //Setup AI behavior Process
            if(ig.input.pressed("bot")){
                //this.getPath(ig.game.mousePointer.pos.x, ig.game.mousePointer.pos.y, true, ['EntityPlayer'], []);
                this.aiBehaviorChanger();
            }
            if(this.botpathtimer.delta() >=0){
                this.botpathtimer.reset();
                if(this.ai.movetargets.length > 0){

                    console.log("get path based on behavior",this.ai.behavior,this.ai.movetargets[0].pos);

                    if(this.ai.behavior == "aggressive"){
                        this.getPath(this.ai.movetargets[0].pos.x, this.ai.movetargets[0].pos.y, true, [], []);
                    }else if(this.ai.behavior == "defensive"){
                        this.getPath(this.ai.movetargets[0].pos.x, this.ai.movetargets[0].pos.y, true, [], []);
                    }else if(this.ai.behavior == "objective"){
                        //Path does not need to be corrected unless it is blank, so just do it a single time.
                        if(this.path == null){
                            this.getPath(this.ai.movetargets[0].pos.x, this.ai.movetargets[0].pos.y, true, [], []);
                        }
                    }else if(this.ai.behavior == "waypoints"){
                        //Will increment this with a touching check.
                        this.getPath(this.ai.movetargets[this.ai.trgIndex].pos.x, this.ai.movetargets[this.ai.trgIndex].pos.y, true, [], []);
                    }
                   
                    console.log("new path rcvd", JSON.stringify(this.path));
                }
                
            }if(this.path != null){
                this.followPath(60,false);
            }
            // this[.getPath(x, y false, ['EntityMonster', 'EntityPlayer', 'EntityFamily', 'EntityObject'], []);;

            //Run Movement AI
                //Chose default behavior first - This can change every few x minutes

                //Each setting has some defaults, just run a check to see if the target is within X distance so it can stop driving.

                //1. If the "think timer" is ready, make a decision about the next action for movement
                //2. Aggressive: Short/Med/Long = Move to target. 256/512/1024
                //  Defensive: Move towards teammate (if not teammates, switch to aggressive)
                //3. Objective: Move to objective and capture
                //4. Waypoints: Pick a 2-4 nodes to partrol.

                //If not at target or within distance, go ahead and keep driving, otherwise dont drive

                //Once target is selected, update with a new path every 1 second

                //run movement method from A*STAR after I update the drive methods



            //Run Shooting AI
                //Chose default attack behavior - Change every 10 seconds based on current situation
                //1.Attack closest to me
                //2.Attack Weakest
                //3.Attack Strongest
                //4.Attack closest to objective

                if(ig.input.pressed("bot")){
                    var shootingChoice = this.chooseRandomShootingBehavior();
                    this.chooseNewAttackTarget();
                }

                //Probably best to just create new weapon class for bots. It would make it easier to manage the update cycle.
                //Just swap out the update with a airun() method instead and call it here to call the aim and shoot methods.
                




        },
        chooseNewAttackTarget: function(){
            //Gather all targets available, only allow other team
	        var allents = new Array();
            if(ig.game.player.team != this.team){
                allents.push(ig.game.player);
            }
            //May need distance check in here as well
            var netents = ig.game.getEntitiesByType(EntityNetplayer);
            for(var p =0;p<netents.length;p++){
                if(netents[p].team != this.team){
                    allents.push(netents[p]);
                }
            }
	        // var botents = ig.game.getEntitiesByType(EntityBot);
            // for(var p =0;p<botents.length;p++){
            //     if(botents[p].team != this.team){
            //         allents.push(botents[p]);
            //     }
            // }
            if(allents.length >0 ){
                var newtarget = allents[0];
                var heath = allents[0].health.current;
                var dis = 99999;
            

                for(var e=0;e<allents.length;e++){
                    var tdis = allents[e].distanceTo(this);
                    var objectives = ig.game.getEntitiesByType(EntityObjective);
                    var odis = allents[e].distanceTo(objectives[0]);
                    var thealth = allents[e].health.current;

                    if(this.ai.trgbehavior == "closest"){
                        if(tdis < dis){
                            newtarget = allents[e];
                            dis = tdis;
                        }
                    }else if(this.ai.trgbehavior == "weakest"){
                        if(theath < heath){
                            newtarget = allents[e];
                            heath = theath;
                        }
                    }else if(this.ai.trgbehavior == "strongest"){
                        if(theath > heath){
                            newtarget = allents[e];
                            heath = theath;
                        }
                    }else if(this.ai.trgbehavior == "objective"){
                        if(odis < dis){
                            newtarget = allents[e];
                            dis = odis;
                        }
                    }
                }
                //Assign newly selected target
                this.ai.attacktarget = newtarget;
            }

            
        },
	    chooseRandomShootingBehavior: function(isNew){
            var behaviors =  ["closest","weakest","strongest","objective"];
            
            if(isNew){//Should the new behavior selection list NOT include the current behavior?
                var n= -1;
                for(var b=0;b<behaviors.length;b++){
                    if(behaviors[b] == this.ai.trgbehavior){n = b;};
                }

                if(n!=-1){behaviors.splice(n,1);};
            }

            var newChoice = behaviors[Math.floor(Math.random() * (behaviors.length - (-0)) + (-0))];
            console.log("new Rand shooting Behavior",newChoice);
            return newChoice
        },
        getOldStatusData: function (attrName) {
            var data;
            var f = -1;
            for (var se = 0; se < this.statusEffectsPrevStats.length; se++) {
                if (this.statusEffectsPrevStats[se].name == attrName) {
                    f = se;
                    data = this.statusEffectsPrevStats[se].oldvalue;
                }
                break;
            }
            if (f != -1) {
                this.statusEffectsPrevStats.splice(f, 1);
            }
            return data;
        },
        runTankCollisionEffects: function () {
            //Check what effects netplayer entities will do to you if they hit you.This reduces the need for remote broadcasts.
            for (var c = 0; c < this.collisionFriction.length; c++) {
                var netEnt = ig.game.getNetPlayerByRemoteId(this.collisionFriction[c].rid);
                //console.log("RunCollision Effect for", netEnt.remoteId)
                if (netEnt != null && netEnt.collisiondata != null) {

                    if (netEnt.collisiondata.enabled) {

                        //Take damage from netplayer ent due to effect
                        var damageBase = ig.copy(netEnt.collisiondata.effect.value);
                        var armorent = null;
                        if (this.collisionFriction[c].pos == "front") {
                            armorent = this.chassisArmor3;
                        } else if (this.collisionFriction[c].pos == "back") {
                            armorent = this.chassisArmor4;
                        } else if (this.collisionFriction[c].pos == "right") {
                            armorent = this.chassisArmor1;
                        } else if (this.collisionFriction[c].pos == "left") {
                            armorent = this.chassisArmor2;
                        }

                        if (armorent != null && netEnt.collisiondata.location == this.collisionFriction[c].netpos) {

                            //Run special effect
                            var randomImpulseX = Math.floor(Math.random() * (50 - (-50)) + (-50));
                            var randomImpulseY = Math.floor(Math.random() * (50 - (-50)) + (-50));//was 0 instead of -50

                            var impacteffect = ig.game.spawnEntity(EntityEyecandy, armorent.pos.x + armorent.size.x / 2, armorent.pos.y + armorent.size.y / 2, {
                                size: { x: 32, y: 32 },
                                animSheet: new ig.AnimationSheet('media/explosions1.png', 32, 32),
                                zIndex: 300,
                                tileSeries: [0, 1, 2, 3, 4],
                                lifespan: .5,
                                endloopanim: true,
                                setAlpha: 1,
                                frameTime: 1//was .1
                            });
                            impacteffect.vel = { x: randomImpulseX, y: randomImpulseY };
                            //Trigger damage
                            console.log("hurting armor from deal damage call", this.collisionFriction[c].pos, damageBase, impacteffect.size);

                            armorent.hurtArmor(damageBase, 'cannon', netEnt.remoteId);
                            //For body damage, divide by 4 and then hit all 4 armors with hurt.
                        }
                    }
                }
            }
        },
        getRealativeAngle: function (collisionpoint, netEnt) {
            var botAngle = Math.round(ig.game.getlimitedAngle(this.body.GetAngle().toDeg()));
            var netentAngle = Math.round(ig.game.getlimitedAngle(netEnt.body.GetAngle().toDeg()));
            var anglediff = botAngle - netentAngle;

            var relativeCollisionPoint = 'none';
            //r-l-f-b this.chassisArmor4
            if (collisionpoint == 'right') {
                armorent = this.chassisArmor1;

                if (anglediff < -135 || anglediff > 135) {
                    //180
                    relativeCollisionPoint = 'right';
                } else if (anglediff > 45 && anglediff <= 135) {
                    //90
                    relativeCollisionPoint = 'front';
                } else if (anglediff > -135 && anglediff <= -45) {
                    //-90
                    relativeCollisionPoint = 'back';
                } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
                    //0
                    relativeCollisionPoint = 'left';
                }
            } else if (collisionpoint == 'left') {
                armorent = this.chassisArmor2;

                if (anglediff < -135 || anglediff > 135) {
                    //180
                    relativeCollisionPoint = 'left';
                } else if (anglediff > 45 && anglediff <= 135) {
                    //90
                    relativeCollisionPoint = 'back';
                } else if (anglediff > -135 && anglediff <= -45) {
                    //-90
                    relativeCollisionPoint = 'front';
                } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
                    //0
                    relativeCollisionPoint = 'right';
                }
            } else if (collisionpoint == 'front') {
                armorent = this.chassisArmor3;

                if (anglediff < -135 || anglediff > 135) {
                    //180
                    relativeCollisionPoint = 'front';
                } else if (anglediff > 45 && anglediff <= 135) {
                    //90
                    relativeCollisionPoint = 'left';
                } else if (anglediff > -135 && anglediff <= -45) {
                    //-90
                    relativeCollisionPoint = 'right';
                } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
                    //0
                    relativeCollisionPoint = 'back';
                }
            } else if (collisionpoint == 'back') {
                armorent = this.chassisArmor4;

                if (anglediff < -135 || anglediff > 135) {
                    //180
                    relativeCollisionPoint = 'back';
                } else if (anglediff > 45 && anglediff <= 135) {
                    //90
                    relativeCollisionPoint = 'right';
                } else if (anglediff > -135 && anglediff <= -45) {
                    //-90
                    relativeCollisionPoint = 'left';
                } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
                    //0
                    relativeCollisionPoint = 'front';
                }
            }
            return relativeCollisionPoint;
        },
        addToCollisionTracker: function (rid, enemyArmor, hitArmor) {
            var f = -1;
            for (var x = 0; x < this.collisionTracker.length; x++) {
                if (this.collisionTracker[x].rid == rid) {
                    f = x;
                }
            }
            if (f == -1) {
                this.collisionTracker.push({ rid: rid, enemyArmor: enemyArmor, hitArmor: hitArmor });
            } else {
                this.collisionTracker[f].enemyArmor = enemyArmor;
                this.collisionTracker[f].hitArmor = hitArmor;
            }
        },
        tankCollision: function (rid, armorpos, netarmorpos, reduction) {
            reduction = (Math.round(reduction * 100)) / 100;
            //Put in check to see if the RID already exists, and if it does, just update it.
            var f = -1;
            for (var x = 0; x < this.collisionFriction.length; x++) {
                if (this.collisionFriction[x].rid == rid) {
                    f = x;
                }
            }
            if (f == -1) {
                this.collisionFriction.push({ rid: rid, pos: armorpos, netpos: netarmorpos, reduc: reduction });
            } else {
                this.collisionFriction[f].pos = armorpos;
                this.collisionFriction[f].netpos = netarmorpos;
                this.collisionFriction[f].reduc = reduction;
            }
            //console.log("Tank on Tank Collision with reduction of :", reduction, armorpos);
            this.addToCollisionTracker(rid, netarmorpos, armorpos);
        },
        endTankCollision: function (rid) {
            //console.log("Tank collision ended:",rid);
            var f = -1;
            for (var x = 0; x < this.collisionFriction.length; x++) {
                if (this.collisionFriction[x].rid == rid) {
                    f = x;
                }
            }
            if (f != -1) {
                //console.log("Tank collision spliced:", f);
                this.collisionFriction.splice(f, 1);
            }
        },
        applyBreaks: function () {

            var linVel = this.body.GetLinearVelocity();
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2((linVel.x * .8), (linVel.y * .8)), this.body.GetPosition());
            //Reduce it by 20% on each game tick
        },
        drive: function (isReverse) {
            if ((this.hp / this.maxphp) >= .7) {
                this.currentAnim = this.anims.drive;
            } else if ((this.hp / this.maxphp) < .7 && (this.hp / this.maxphp) >= .3) {
                this.currentAnim = this.anims.driveDamaged;
            } else if ((this.hp / this.maxphp) < .3 && (this.hp / this.maxphp) >= 0) {
                this.currentAnim = this.anims.driveCritical;
            } else {
                this.currentAnim = this.anims.drive;
            }

            var velX = 0;
            var velY = 0;
            var appliedSpeed = this.movespeed + this.moveboost;
            if (this.collisionFriction.length > 0) {
                //In a tank on tank collision, so reduce max speed, and therefore max power creating the illusion of friction.
                //Compare front or back armor hit and then check isReverse or not reverse. Then reduce if it is the armor direction impact.
                var reductionMin = 1;
                for (var x = 0; x < this.collisionFriction.length; x++) {
                    if (!isReverse && this.collisionFriction[x].pos == 'front') {
                        if (reductionMin > this.collisionFriction[x].reduc) { reductionMin = this.collisionFriction[x].reduc };
                    }
                    if (isReverse && this.collisionFriction[x].pos == 'back') {
                        if (reductionMin > this.collisionFriction[x].reduc) { reductionMin = this.collisionFriction[x].reduc };
                    }
                }

                appliedSpeed = reductionMin * appliedSpeed;
                //console.log("Speed is being affected by friction:", (this.movespeed + this.moveboost), appliedSpeed);
            }
            var maxSpeed = appliedSpeed;
            //Get X and Y increase values based on current body angle and movement speed. (Reverse these if REVERSE GEAR is true)
            velX = Math.cos(this.body.GetAngle()) * appliedSpeed;
            velY = Math.sin(this.body.GetAngle()) * appliedSpeed;
            if (isReverse) {
                velX = (velX * this.reversespeed) * -1;
                velY = (velY * this.reversespeed) * -1;
                maxSpeed = this.reversespeed * appliedSpeed;
            }
            //Get a consistent travel rate
            var linVel = this.body.GetLinearVelocity();
            var xChange = velX - linVel.x;
            var yChange = velY - linVel.y;
            var xforce = this.body.GetMass() * xChange / (1 / 60);
            var yforce = this.body.GetMass() * yChange / (1 / 60);
            //this.body.ApplyForce(new Box2D.Common.Math.b2Vec2(xforce, yforce), this.body.GetPosition());
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(velX, velY), this.body.GetPosition());
            var speed = this.body.m_linearVelocity.Normalize(); // sets vector length to 1, returns original length of vector
            this.body.m_linearVelocity.Multiply(Math.min(speed, maxSpeed));//Speed, maxspeed
        },
        turn: function (angVel) {
            this.body.SetAngularVelocity(angVel);
        },
        draw: function () {
            //Draw AI node pathing for debugging
            this.drawPath(60,100,60,1,5);

            if (this.active && ig.game.startGame == true) {
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


                this.parent();
                var context = ig.system.context;


                context.fillStyle = "rgba(5,5,5, .2)";
                context.fillRect((this.pos.x - ig.game.screen.x - 16) * ig.system.scale, (this.pos.y - ig.game.screen.y - 16) * ig.system.scale, 128 * ig.system.scale, 1 * ig.system.scale);

                context.fillStyle = "rgba(50, 240, 50, .8)";
                context.fillRect((this.pos.x - ig.game.screen.x - 16)*ig.system.scale, (this.pos.y - ig.game.screen.y - 16)*ig.system.scale, Math.round(128 * (this.hp / this.maxphp)) * ig.system.scale, 1 * ig.system.scale);


                //DEBUG DRAWS
                //this.font.draw("ANGLE:" + (Math.round(this.body.GetAngle() * 100) / 100), this.pos.x - ig.game.screen.x + 8, this.pos.y - ig.game.screen.y - 32);
                //this.font.draw("ANGVEL:" + (Math.round(this.body.GetAngularVelocity() * 100) / 100), this.pos.x - ig.game.screen.x + 8, this.pos.y - ig.game.screen.y - 32)
                //this.font.draw(this.distanceTo(ig.game.waypoint), this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y + this.size.y + 32);
                //if (ig.input.state("reverseGear")) {
                //    this.font.draw("REVERSING: " + this.reversespeed, this.pos.x - ig.game.screen.x - 16, this.pos.y - ig.game.screen.y - 32);
                //}
                //this.font.draw("MoveStatus: " + this.destination.move, this.pos.x - ig.game.screen.x + 48, this.pos.y - ig.game.screen.y - 96);
                //this.font.draw("currA: " + this.destination.currentAngle + " targetA: " + this.destination.targetAngle, this.pos.x - ig.game.screen.x + 48, this.pos.y - ig.game.screen.y - 128);

                ////Angles on circle
                //for (var i = 0; i < 36; i++) {
                //    var angleD = i * 10;
                //    var angleR = angleD.toRad();
                //    this.font.draw(angleD, Math.cos(angleR) * 128 + this.pos.x - ig.game.screen.x + this.size.x / 2, Math.sin(angleR) * 128 + this.pos.y - ig.game.screen.y + this.size.y / 2);
                //}
                ////Game Screen position
                //this.font.draw("X:" + this.pos.x + this.size.x / 2, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 164);
                //this.font.draw("Y:" + this.pos.y + this.size.y / 2, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 140);
                //this.font.draw("Xb2d:" + (this.pos.x + this.size.x / 2) * Box2D.SCALE, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 212);
                //this.font.draw("Yb2d:" + (this.pos.y + this.size.y / 2) * Box2D.SCALE, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 188);
                //this.font.draw("Xb2dGP: " + this.body.GetPosition().x, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 262);
                //this.font.draw("Yb2dGP: " + this.body.GetPosition().y, this.pos.x - ig.game.screen.x + this.size.x / 2, this.pos.y - ig.game.screen.y + this.size.y / 2 - 236);
                //this.body.GetPosition().x /  Box2D.SCALE
                //Display Conditions and effects

                //DRAW PLAYER INFO
                this.fontborder.draw(this.botName, this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y - 48);

                ////DRAW OPTICS BORDER
                //context.beginPath();
                //context.arc((this.pos.x - ig.game.screen.x + this.size.x / 2) * ig.system.scale, (this.pos.y - ig.game.screen.y + this.size.y / 2) * ig.system.scale, this.optics * ig.system.scale, 0, 2 * Math.PI, false);
                //context.lineWidth = 1;
                //context.strokeStyle = '#333333';
                //context.stroke();

                //Draw Pathfinding helper data
                
                //Get this current ents body position center and draw out the tile size and get the boundaries
                var useThisMap = null;
                if (ig.game.aiMap == null) {
                    useThisMap = ig.game.collisionMap;
                } else {
                    useThisMap = ig.game.aiMap;
                }

                var thisCenterTile = {
                    x1: this.body.GetPosition().x / Box2D.SCALE - (useThisMap.tilesize / 2),
                    y1: this.body.GetPosition().y / Box2D.SCALE - (useThisMap.tilesize / 2),
                    x2: this.body.GetPosition().x / Box2D.SCALE + (useThisMap.tilesize / 2),
                    y2: this.body.GetPosition().y / Box2D.SCALE + (useThisMap.tilesize / 2),
                    c: { x: this.body.GetPosition().x / Box2D.SCALE, y: this.body.GetPosition().y / Box2D.SCALE }
                };
                if (this.path) {
                    var targetCenter = {
                        x: this.path[0].x + (useThisMap.tilesize / 2),
                        y: this.path[0].y + (useThisMap.tilesize / 2)
                    };
                    //Draw distance line and font
                    var dCurrent = Math.sqrt((thisCenterTile.c.x - targetCenter.x) * (thisCenterTile.c.x - targetCenter.x) + (thisCenterTile.c.y - targetCenter.y) * (thisCenterTile.c.y - targetCenter.y));
                    this.fontborder.draw("d:" + dCurrent, this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y + 150);
                    context.strokeStyle = "rgba(102, 102, 151, 1)";
                    context.beginPath();
                    context.moveTo((targetCenter.x - ig.game.screen.x)*ig.system.scale, (targetCenter.y - ig.game.screen.y)*ig.system.scale);
                    context.lineTo((thisCenterTile.c.x - ig.game.screen.x)*ig.system.scale, (thisCenterTile.c.y - ig.game.screen.y)*ig.system.scale);
                    context.stroke();

                    this.fontborder.draw("CenterTile:" + JSON.stringify(thisCenterTile), this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y + 175);
                    this.fontborder.draw("PATH:" + JSON.stringify(this.path), this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y + 190);
                }
                //Draw path[0] tile and this centertile
                //Last Pos
	            context.beginPath();
                context.rect(
                    (this.lastbox2dtile.x1 - ig.game.screen.x)*ig.system.scale, 
                    (this.lastbox2dtile.y1 - ig.game.screen.y)*ig.system.scale, 
                    (useThisMap.tilesize) * ig.system.scale,
                    (useThisMap.tilesize) * ig.system.scale)
                    ;
                context.fillStyle = "rgba(155, 50, 50, .2)";
                //Current Center Pos
                context.fill();
                context.beginPath();
                context.rect(
                    (thisCenterTile.x1 - ig.game.screen.x)*ig.system.scale, 
                    (thisCenterTile.y1 - ig.game.screen.y)*ig.system.scale, 
                    (useThisMap) * ig.system.scale,
                    (useThisMap) * ig.system.scale)
                    ;
                context.fillStyle = "rgba(50, 50, 50, .2)";
                context.fill();
                context.closePath();
                if(this.path != null){
                    //Does it overlap?
                    context.beginPath();
                    context.rect(
                        (this.path[0].x - ig.game.screen.x)*ig.system.scale, 
                        (this.path[0].y - ig.game.screen.y)*ig.system.scale, 
                        (useThisMap.tilesize) * ig.system.scale,
                        (useThisMap.tilesize) * ig.system.scale
                    );
                    if(((thisCenterTile.x1 >= this.path[0].x && this.lastbox2dtile.x1 < this.path[0].x) || (thisCenterTile.x1 <= this.path[0].x && this.lastbox2dtile.x1 > this.path[0].x) || thisCenterTile.x1 == this.path[0].x) && 
			        ((thisCenterTile.y1 >= this.path[0].y &&this.lastbox2dtile.y1 < this.path[0].y) || (thisCenterTile.y1 <= this.path[0].y && this.lastbox2dtile.y1 > this.path[0].y) || thisCenterTile.y1== this.path[0].y)) {
			            context.fillStyle = "rgba(50, 100, 100, .2)";
                    }else{
                        context.fillStyle = "rgba(50, 100, 50, .2)";
                    }
                   
                    context.fill();
                    context.closePath();
                    //Get Angle to point to decide if we should start turning
                    var angleRadians = Math.atan2((this.path[0].y + (useThisMap.tilesize / 2)) - (this.body.GetPosition().y / Box2D.SCALE), (this.path[0].x + (useThisMap.tilesize / 2)) - (this.body.GetPosition().x / Box2D.SCALE));
                    //Apply forward speed if the angle is within a +/- 45 deg range, with the speed increasing
                    

                    var targetAngleDeg = Math.round(angleRadians * 180 / Math.PI);
                    var currentBodyAngleDeg = Math.round(this.body.GetAngle() * 180 / Math.PI);

                    var wptarg = "";
                    if(this.ai.weapontarget != null){
                        wptarg = this.ai.weapontarget.name;
                    }

                    var tmpObj = {c:this.ai.behavior, trgb:this.ai.trgbehavior, kc: this.ai.killcount, dc:this.ai.deathcount, mv: this.ai.movetargets.length, wtrg:wptarg};
                    this.fontborder.draw(JSON.stringify(tmpObj), this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y - 160);
                    //Convert to a 360 deg angle
                    targetAngleDeg = ig.game.convertAngleTo360(targetAngleDeg);
                    currentBodyAngleDeg = ig.game.convertAngleTo360(currentBodyAngleDeg);
                    //
                    // context.strokeStyle = "rgba(102, 255, 51, .1)";
                    // context.beginPath();
                    // context.moveTo(x, y);
                    // context.lineTo(x + 512 * Math.cos(angleLower), y + 512 * Math.sin(angleLower));
                    // context.stroke();
                    this.fontborder.draw(targetAngleDeg+","+currentBodyAngleDeg, this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y - 124);
                }
                
            }
        },

        addStatusEffect: function (type, seconds, value, reapply) {

            //this.statusEffectsPrevStats.push({old stats})
            //this.statusEffects.push({ name: this.effectType, stack: this.effectTime, value: 5 });

            //Setup ability unique logic here
            var effectFound = false;
            for (var e = 0; e < this.statusEffects.length; e++) {
                if (this.statusEffects[e].name == type) {
                    effectFound = true;
                    if (!reapply) {
                        if (this.statusEffects[e].value < value) {
                            this.statusEffects[e].value = value;
                            this.statusEffects[e].stack = seconds;
                            this.statusEffects[e].stackmax = seconds;
                        } else {
                            this.statusEffects[e].stack = seconds;
                            this.statusEffects[e].stackmax = seconds;
                        }
                    }
                }
            }
            if (!effectFound) {
                this.statusEffects.push({ name: type, stack: seconds, value: value, stackmax: seconds, reapply: reapply });
                //console.log("Status Effected Added by ", type, seconds, value);
            }


        },
        effect: function (effecttype) {
            if (effecttype == 'explode') {
                //console.log("EFFECT FUNCT: TRIGGER EXPLODE");
                var settings = ig.game.db.projectileDbArray[9];

                for (var p = 0; p < 32; p++) {//16 Projectiles, I can work this later.
                    //Create projectile with directional impulse. 360/(16-p)
                    var angle = (360 / 32) * p;
                    //new b2Vec2(50*Math.cos(angle*Math.PI/180),50*Math.sin(angle*Math.PI/180));//Where 50 is the force vel * the angle to coordinate conversion

                    var shrapnel = ig.game.spawnEntity(EntityProjectile, Math.round(this.pos.x + 5 * Math.cos(angle * Math.PI / 180)), Math.round(this.pos.y + 5 * Math.sin(angle * Math.PI / 180)), settings);
                    shrapnel.ownerRID = this.remoteId;
                    shrapnel.team = this.team;
                    shrapnel.gravityFactor = 0;
                    shrapnel.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(Math.round(15 * Math.cos(angle * Math.PI / 180)), Math.round(15 * Math.sin(angle * Math.PI / 180))), shrapnel.body.GetPosition());

  
                    ig.game.gamesocket.sendprojectile({
                        ent: "EntityProjectile",
                        x: Math.round(this.pos.x + 5 * Math.cos(angle * Math.PI / 180)),
                        y: Math.round(this.pos.y + 5 * Math.sin(angle * Math.PI / 180)),
                        settings: settings,
                        angle: angle * Math.PI / 180,
                        remoteId: this.remoteId,
                        team: this.player.team
                    });
                }
            }
        },
        hurt: function (damageObj, remoteId) {
            //******************DAMAGE TRACKING********************************
            //damageSources - track who did what damage to bot
            var srcfoundthislife = -1;
            for (var f = 0; f < this.scoreTrackingPerLife.damageSources.length; f++) {
                if (this.scoreTrackingPerLife.damageSources[f].remoteId == remoteId) {
                    srcfoundthislife = f;
                    break;
                }
            }

            if (srcfoundthislife == -1) {
                //Yes, then push the new source in
                this.scoreTrackingPerLife.damageSources.push({ remoteId: remoteId, damage: damageObj.hp });
            } else {
                //No, then update the found remote id
                this.scoreTrackingPerLife.damageSources[srcfoundthislife].damage = this.scoreTrackingPerLife.damageSources[srcfoundthislife].damage + damageObj.hp;
            }

            //*****************************************************************
            //Spawn Defense drone if trait exists and drone is null (not alive)
            if (this.hasDefenseDrone) {
                if (this.defenseDroneEnt == null) {
                    this.defenseDroneSpawnReady = true;
                }
            }


        },
        createFilterData: function(category,mask,group){
                console.log("create Collision data", category, mask, group);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = category;
                newFilterData.maskBits = mask; 
                newFilterData.groupIndex = group;
                return newFilterData;
        },
        enableCollisionStatus: function (state){
            if(!state){
                //Set for main body
                this.body.GetFixtureList().SetFilterData(this.createFilterData(this.categoryBits,0x0000,-5));
                this.body.SetAngularDamping(.5);
                this.body.enabled = false;
                //Set for weapons
                var wp  = null;
                for (var d = 0; d < this.hardpoints.length; d++) {
                    wp = this.hardpoints[d].weapon;    
                    wp.body.GetFixtureList().SetFilterData(this.createFilterData(wp.categoryBits,0x0000,-5));
                    wp.body.SetAngularDamping(.5);
                    wp.body.enabled = false;
                }
                //Set for armor
                this.chassisArmor1.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor1.categoryBits,0x0000,-5));this.chassisArmor1.body.enabled = false;  
                this.chassisArmor2.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor2.categoryBits,0x0000,-5));this.chassisArmor2.body.enabled = false;  
                this.chassisArmor3.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor3.categoryBits,0x0000,-5));this.chassisArmor3.body.enabled = false;  
                this.chassisArmor4.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor4.categoryBits,0x0000,-5));this.chassisArmor4.body.enabled = false;  

            }else{
                //Set for main body
                this.body.GetFixtureList().SetFilterData(this.createFilterData(this.categoryBits,this.maskBits,-5));
                this.body.SetAngularDamping(.5);
                this.body.enabled = true;
                //Set for weapons
                var wp  = null;
                for (var d = 0; d < this.hardpoints.length; d++) {
                    wp = this.hardpoints[d].weapon;    
                    wp.body.GetFixtureList().SetFilterData(this.createFilterData(wp.categoryBits,wp.maskBits,-5));
                    wp.body.SetAngularDamping(.5);
                    wp.body.enabled = true;
                }
                //Set for armor
	            this.chassisArmor1.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor1.categoryBits,this.chassisArmor1.maskBits,-5));this.chassisArmor1.body.enabled = true; 
                this.chassisArmor2.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor2.categoryBits,this.chassisArmor2.maskBits,-5));this.chassisArmor2.body.enabled = true; 
                this.chassisArmor3.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor3.categoryBits,this.chassisArmor3.maskBits,-5));this.chassisArmor3.body.enabled = true; 
                this.chassisArmor4.body.GetFixtureList().SetFilterData(this.createFilterData(this.chassisArmor4.categoryBits,this.chassisArmor4.maskBits,-5));this.chassisArmor4.body.enabled = true; 
            }
        },
        death: function (killerRemoteId) {
            if (this.deathEffect == 'explode') {
                this.performDeathEffect = true;
            }
            this.hp = 0;
            //Get score index of killer and player
            var scoreIndexKill = ig.game.getScoreIndexByRemoteId(killerRemoteId);
            console.log("botDeath", scoreIndexKill);

            //update kill score for killer
            ig.global.scores[scoreIndexKill].kills = ig.global.scores[scoreIndexKill].kills + 1

            //who gets the assist?
            if (this.scoreTrackingPerLife.damageSources.length > 1) {
                this.scoreTrackingPerLife.damageSources.sort(this.sortIncomingDamage);

                //Get score index of assister
                var assistWinner = this.scoreTrackingPerLife.damageSources[this.scoreTrackingPerLife.damageSources.length - 1].remoteId;
                var assist_secondplace = this.scoreTrackingPerLife.damageSources[this.scoreTrackingPerLife.damageSources.length - 2].remoteId;

                if (assistWinner == killerRemoteId) {
                    assistWinner = assist_secondplace;
                };
                //Emit Assist Update for the most damage
                this.grantAssistScore(assistWinner);
            }

            //Emit kill update for player that scored kill.
            this.grantKillScore(killerRemoteId);

            //Announce death
            ig.game.gamesocket.announce({ text: this.remoteId + " got killed!" });
            ig.game.gamesocket.send('killed', { remoteId: this.remoteId, playerName: this.remoteId });

            //Set inactive
            this.active = false;

            //clear single life stats
            this.scoreTrackingPerLife.damageSources = [];
            this.scoreTrackingPerLife.damageSources.length = 0;

            //this.pos = { x: -1000, y: -1000 };
            //this.body.SetPosition(new Box2D.Common.Math.b2Vec2(this.pos.x * Box2D.SCALE, this.pos.y * Box2D.SCALE));
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
            this.body.SetAngularVelocity(0);
            this.body.SetAngle(0);
            this.body.SetAwake(true);

            //What I might want to do is do a runtime set collision filter to NOT COLLIDE WITH ANYTHING. Then, renable all of them during respawn.
            //Deactivate Armors to remove Draw/Update
            this.chassisArmor1.active = false;
            this.chassisArmor1.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            this.chassisArmor2.active = false;
            this.chassisArmor2.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            this.chassisArmor3.active = false;
            this.chassisArmor3.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            this.chassisArmor4.active = false;
            this.chassisArmor4.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            //Deactivate Hardpoints to remove Draw/Update, Remove targeting and behavior modes
            for (var d = 0; d < this.hardpoints.length; d++) {
                this.hardpoints[d].weapon.active = false;
                //this.hardpoints[d].weapon.pointTarget.pos = { x: this.pos.x, y: this.pos.y };
                this.hardpoints[d].weapon.behavior = 1;
                this.hardpoints[d].weapon.body.SetPosition(new Box2D.Common.Math.b2Vec2(-100, -100));
            }
            //Set camera position' zone.pos.x + zone.size.x / 2, zone.pos.y + zone.size.y / 2
            if (this.team == 2) {
                var zone = ig.game.getEntityByName('team2spawn');
            } else {
                var zone = ig.game.getEntityByName('team1spawn');
            };

            //Set respawn timer
            //base off of clock
            if (ig.global.playerIsHost == false) {
                var totalseconds = Math.round(ig.game.startGameClock.clienttime + ig.game.startGameClock.clock.delta());
            } else {
                var totalseconds = Math.round(ig.game.startGameClock.clock.delta())
            }
            this.botRespawnTimer.set((5 + Math.round((this.maxphp / 4) / 10)) + (Math.round(totalseconds / 60) * 3));

            //Disable collisions
            this.enableCollisionStatus(false);
        },
        grantAssistScore: function (remoteId) {
            //console.log("Grant assist for " + remoteId);
            ig.game.gamesocket.send('scoreassist', {
                remoteId: remoteId,
            });
        },

        grantKillScore: function (remoteId) {
            //console.log("Grant kill for " + remoteId);
            ig.game.gamesocket.send('scorekill', {
                remoteId: remoteId,
            });
        },
        sortIncomingDamage: function (a, b) {

            if (a.damage < b.damage)
                return -1;
            if (a.damage > b.damage)
                return 1;
            return 0;

        },
        configChassisSetPosition: function (b2vector) {
            this.setchassisPos.ready = true;
            this.setchassisPos.b2vec = b2vector;
        },
        chassisSetPosition: function (b2vector) {
            this.setchassisPos.ready = false;
            this.body.SetPosition(b2vector);
            this.chassisArmor1.body.SetPosition(b2vector);
            this.chassisArmor2.body.SetPosition(b2vector);
            this.chassisArmor3.body.SetPosition(b2vector);
            this.chassisArmor4.body.SetPosition(b2vector);
            for (var d = 0; d < this.hardpoints.length; d++) {
                this.hardpoints[d].weapon.body.SetPosition(b2vector);
            }

        },
        configspawn: function (x, y) {
            //console.log("ConfigSpawn at X:" + x + " Y:" + y);
            if (ig.game.hud.endGameStatus == false || ig.game.hud.endGameStatus == undefined) {
                this.spawn.ready = true;
                this.spawn.x = x;
                this.spawn.y = y;
                //var classObjectCopy = JSON.parse(JSON.stringify(ig.global.class));
                //console.log("JSON PARSE OF SPAWN: " + JSON.stringify(ig.global.class) );

                //!!!!!!!!!!!!!!!This will need some modification for the bot setup!!!!!!!!!!!!!!!
                // ig.game.gamesocket.send('botrespawn', {
                //     spawnpos: { x: x, y: y },
                //     remoteId: this.remoteId,
                //     playerName: this.remoteId,
                //     hardpoints: ig.game.db.classDbArray[this.botClass].hardpoints,
                //     stealth: this.stealth,
                //     optics: this.optics,
                //     classType: this.classType,
                //     classId: this.botClass,
                //     density: this.density,
                //     team: this.team,
                // });
            }
        },
        respawn: function () {

            this.spawn.ready = false;
            this.enableCollisionStatus(true);

            var spPosX = (this.spawn.x - (this.size.x / 2)) * Box2D.SCALE;
            var spPosY = (this.spawn.y - (this.size.y / 2)) * Box2D.SCALE;
            //Set position of all player componenets
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            this.chassisArmor1.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            this.chassisArmor2.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            this.chassisArmor3.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            this.chassisArmor4.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            for (var d = 0; d < this.hardpoints.length; d++) {
                this.hardpoints[d].weapon.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
            }
            //Wake up
            this.active = true;
            this.body.SetAwake(true);
            //Set Velocities
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
            this.body.SetAngularVelocity(0);

            //Set angles
            if (this.team == 2) {
                //this.body.SetPositionAndAngle(this.body.GetPosition(), (1*Math.PI));
                this.body.SetAngle((Math.PI));
                for (var d = 0; d < this.hardpoints.length; d++) {
                    this.hardpoints[d].weapon.body.SetAngle((Math.PI));
                }
                this.initialAngle.enabled = true;
                this.initialAngle.angle = Math.PI;
            } else {

                this.body.SetPositionAndAngle(this.body.GetPosition(), (0));
                this.body.SetAngle(0);

                this.initialAngle.enabled = true;
                this.initialAngle.angle = 0;
            }

            this.hp = this.maxphp;
            //Activate Armors to remove Draw/Update
            this.chassisArmor1.active = true;
            this.chassisArmor2.active = true;
            this.chassisArmor3.active = true;
            this.chassisArmor4.active = true;
            this.chassisArmor1.hp = this.chassisArmor1.maxhp;
            this.chassisArmor2.hp = this.chassisArmor2.maxhp;
            this.chassisArmor3.hp = this.chassisArmor3.maxhp;
            this.chassisArmor4.hp = this.chassisArmor4.maxhp;
            this.chassisArmor1.mp = 100;
            this.chassisArmor2.mp = 100;
            this.chassisArmor3.mp = 100;
            this.chassisArmor4.mp = 100;
            this.chassisArmor1.currentAnim = this.chassisArmor1.anims.full;
            this.chassisArmor2.currentAnim = this.chassisArmor2.anims.full;
            this.chassisArmor3.currentAnim = this.chassisArmor3.anims.full;
            this.chassisArmor4.currentAnim = this.chassisArmor4.anims.full;

            //Active Hardpoints to remove Draw/Update
            for (var d = 0; d < this.hardpoints.length; d++) {
                //Update weapons to active and refill ammo
                this.hardpoints[d].weapon.active = true;
                this.hardpoints[d].weapon.ammoCurrent = this.hardpoints[d].weapon.ammoMax;
            }
            //Reset ability just to keep the cooldowns correct
            this.abilitySlot1.reinit();
        },
        stopMovement: function () {
            //STOP
            //console.log("STOP BODY!");
            this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
            this.body.SetAngularVelocity(0);
            this.destination.move = false;
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
        applyPerks: function () {
            for (var p = 0; p < ig.global.perks.length; p++) {
                var id = ig.global.perks[p];
                //console.log("Applying perk with ID", ig.global.perks[p], " name ", ig.game.db.perkDbArray[id].name);

                if (ig.game.db.perkDbArray[id].name == 'Basic Engineering') {
                    this.regen = ig.game.db.perkDbArray[id].value.n + this.regen;
                    this.regenTimer = new ig.Timer(2);
                } else if (ig.game.db.perkDbArray[id].name == 'Speed Demon') {
                    this.movespeed = ig.game.db.perkDbArray[id].value.n + this.movespeed;
                } else if (ig.game.db.perkDbArray[id].name == 'Beefy') {
                    this.maxphp = ig.game.db.perkDbArray[id].value.n * this.maxphp + this.maxphp;
                } else if (ig.game.db.perkDbArray[id].name == 'Guns Blazing') {
                    for (var h = 0; h < this.hardpoints.length; h++) {
                        this.hardpoints[h].weapon.rotationSpeed = ig.game.db.perkDbArray[id].value.n + this.hardpoints[h].weapon.rotationSpeed;
                    }
                } else if (ig.game.db.perkDbArray[id].name == 'Sneaky Peeky') {
                    this.stealth = this.stealth / 2;
                } else if (ig.game.db.perkDbArray[id].name == 'Sniper') {
                    this.optics = Math.round(this.optics * 1.5);
                } else if (ig.game.db.perkDbArray[id].name == 'Explosive Temper') {
                    this.deathEffect = 'explode';
                } else if (ig.game.db.perkDbArray[id].name == 'Heroic') {
                    this.heroic = true;
                } else if (ig.game.db.perkDbArray[id].name == 'Skillfull') {
                    this.abilitySlot1.cooldown = Math.round(this.abilitySlot1.cooldown * .80); //20% reduction in CD
                } else if (ig.game.db.perkDbArray[id].name == 'Bulletstorm') {
                    for (var w = 0; w < this.hardpoints.length; w++) {
                        //Raise all weapons up to double magazine size.
                        this.hardpoints[w].weapon.ammoCurrent = this.hardpoints[w].weapon.ammoCurrent * 2;
                        this.hardpoints[w].weapon.ammoMax = this.hardpoints[w].weapon.ammoMax * 2;
                    }
                } else if (ig.game.db.perkDbArray[id].name == 'Phoenix') {
                    this.respawnBonus = .85;//15% reduction in respawn time. Better the longer the game goes.
                } else if (ig.game.db.perkDbArray[id].name == 'Turtle') {
                    //Slower -30%, but thicker armor 20%
                    this.chassisArmor1.hp = this.chassisArmor1.hp + Math.round(this.chassisArmor1.hp * .20);
                    this.chassisArmor2.hp = this.chassisArmor2.hp + Math.round(this.chassisArmor1.hp * .20);
                    this.chassisArmor3.hp = this.chassisArmor3.hp + Math.round(this.chassisArmor1.hp * .20);
                    this.chassisArmor4.hp = this.chassisArmor4.hp + Math.round(this.chassisArmor1.hp * .20);

                    this.chassisArmor1.maxhp = this.chassisArmor1.maxhp + Math.round(this.chassisArmor1.maxhp * .20);
                    this.chassisArmor2.maxhp = this.chassisArmor2.maxhp + Math.round(this.chassisArmor1.maxhp * .20);
                    this.chassisArmor3.maxhp = this.chassisArmor3.maxhp + Math.round(this.chassisArmor1.maxhp * .20);
                    this.chassisArmor4.maxhp = this.chassisArmor4.maxhp + Math.round(this.chassisArmor1.maxhp * .20);

                    this.movespeed = Math.round(this.movespeed * .70);

                } else if (ig.game.db.perkDbArray[id].name == 'Defense Drone') {
                    this.hasDefenseDrone = true;
                } else if (ig.game.db.perkDbArray[id].name == 'Triage') {
                    this.hasTriage = true;
                    this.triageTimer = new ig.Timer(20);
                } else if (ig.game.db.perkDbArray[id].name == 'Quick Turn') {
                    this.turnRate = this.turnRate + ig.game.db.perkDbArray[id].value.n;
                }
            }
        },
        gatherWeaponAngles: function () {
            var wpsAngles = new Array();
            for (var w = 0; w < this.hardpoints.length; w++) {
                var a = this.hardpoints[w].weapon.body.GetAngle().round(2);
                wpsAngles.push(a);
            }
            return wpsAngles;
        },
    });


});