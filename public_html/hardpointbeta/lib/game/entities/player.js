ig.module(
	'game.entities.player'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function(){

    EntityPlayer = ig.Box2DEntity.extend({
	size: {x: 128, y: 64},
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
	name: "player",
        //Custom
    playerName: "newbie",
    spawn: { ready: false, x: 0, y: 0 },
    setchassisPos: {ready: false, b2vec: null},
	entityType: "player",
	handlesInput: true,
	remoteId: 0,
    isHost: false,//If the first player, make host for crate and barrel creation.
	active: false,
	playerClass: -1,
    classType: "none",
    hp: 500,
    maxphp: 500,
    respawnBonus: 0,
    armor: {f:0,l:0,r:0,b:0},
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
    destination: { move: false, x: 0, y: 0 , currentAngle: 0 , targetAngle: 0},
    lockCamera: true, //Is the camera locked to the player?
    engineStarted: false,
    initialAngle: {enabled: false, angle: Math.PI, c:0},
    //Combat
    inCover: false,
    points: 0,
    team: 1,//0 means unassigned, 1 for testing
    flagheld: false,
    //Weapons - These will be taken from the weapon later
	rateOfFire: 15,//Every 15 frames
	rateOfFireCount: 0,
	hardpoints: [{ wpid: 4, location: (0, 0), arc: true, arcAngle: 45, weapon: null, weldjoin: null }],
	weaponSlot1: null,
	weaponSlot2: null,
	abilitySlot1: {status:'inactive', ability: null},
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
    scoreTrackingPerLife: {damageSources: new Array()},
    scoretrackingindex: -1,
    font: new ig.Font('media/04b03.font.png'),
    fontborder: new ig.Font('media/04b03.font.png', { borderColor: '#000', borderSize: 1 }),
    hud_screenlock: new ig.Image('media/screenlock2.png'),
    //Collision Filtering
    categoryBits: ig.global.COL_PLAYER,      // collsion type localPlayer
    //maskBits: ~0x0008 && 0xFFFF,        // does not collide with localBullet and collides with everything else
    maskBits: ~ig.global.COL_BULLET_LOCAL,
	init: function( x, y, settings ) {
        //Adjust X/Y location per player
	    //var allPlayers = ig.game.getEntitiesByType(EntityPlayer);
	    //x = x + 64 * allPlayers.length;
	    this.parent(x, y, settings);
	    //this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
	    //this.body.SetPosition(new Box2D.Common.Math.b2Vec2(x * Box2D.SCALE, y * Box2D.SCALE));
	    if (ig.global.login.alias == "newbie" || ig.global.playerName == "") {

	        ig.global.login.alias = ig.global.playerName = "newbie" + Math.round(Math.random() * 10000);
	        this.playerName = ig.global.playerName;
	    }
	    this.playerName = ig.global.login.alias;
	    this.mpUpdateTimer = new ig.Frametimer(0, 5);
 
        //Check status effects
		this.statusEffectTimer = new ig.Timer(1);

        //local player class spawn
		this.animSheet = new ig.AnimationSheet('media/tankchass_sheet2.png', 128, 64);
		//this.playerClass = ig.copy(ig.global.class);
	    //this.hardpoints = this.playerClass.hardpoints;

		//console.log("Player class init, create hardpoints:" +  JSON.stringify(this.hardpoints));
		ig.game.player = this;
	    //Ability
		this.abilitySlot1 = new ability(ig.game.db.abilityArray[ig.global.class.classid]);
	    //Joint types: b2WeldJointDef , b2DistanceJointDef, b2RevoluteJointDef
	    //Setup Armor
		this.chassisArmor1 = ig.game.spawnEntity(EntityArmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "right", hp: this.armor.r * 100 + 100 });
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

		this.chassisArmor2 = ig.game.spawnEntity(EntityArmor, this.pos.x + this.size.x, this.pos.y + this.size.y / 2, { armorPosition: "left", hp: this.armor.l * 100 + 100 });
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

		this.chassisArmor3 = ig.game.spawnEntity(EntityArmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "front", hp: this.armor.f * 100 + 100 });
		var weldJointAr1 = new Box2D.Dynamics.Joints.b2WeldJointDef();
		weldJointAr1.bodyA = this.body;
		weldJointAr1.bodyB = this.chassisArmor3.body;
		weldJointAr1.collideConnected = false;
		weldJointAr1.localAnchorA = new Box2D.Common.Math.b2Vec2(this.size.x / 2 * Box2D.SCALE + .5, 0);
		weldJointAr1.localAnchorB = new Box2D.Common.Math.b2Vec2(0, 0);
		weldJointAr1.referenceAngle = 90/180*Math.PI;
	    //weldJointAr1.enableLimit = true;
	    //weldJointAr1.lowerAngle = 0;
	    //weldJointAr1.upperAngle = 0;
		this.chassisArmor3.weldjoin = ig.world.CreateJoint(weldJointAr1);

		this.chassisArmor4 = ig.game.spawnEntity(EntityArmor, this.pos.x + this.size.x, 0, { size: { x: 64, y: 8 }, animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 64, 8), armorPosition: "back", hp: this.armor.b * 100 + 100 });
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
		//console.log("SETUP PLAYER WEAPONS : ARRLENGTH : " + this.hardpoints.length + " class " + this.playerClass.classid);
		for (var w = 0; w < this.hardpoints.length; w++) {
		    //Make Weapon
		    //console.log("New Weapon:" + ig.game.db.weaponDbArray[this.hardpoints[w].wpid].name);
		    this.hardpoints[w].weapon = ig.game.spawnEntity(EntityWeapon, x, y, ig.game.db.weaponDbArray[this.hardpoints[w].wpid]);
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

		    weldJointDef1.localAnchorA = new Box2D.Common.Math.b2Vec2(loc.x,loc.y);

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

		if (!ig.global.wm) {		    
		    //this.body.SetFixedRotation(true);
		    this.body.userData = "player";
            
            //Make active
		    this.active = true;
		    this.remoteAnim = "idle";
		    //Set filters for collision

		    var newFilterData = new Box2D.Dynamics.b2FilterData;
		    newFilterData.groupIndex = -9;//-9 For weapon and tank chassis and armor
		    newFilterData.categoryBits = this.categoryBits;
		    newFilterData.maskBits = this.maskBits;
		    this.body.GetFixtureList().SetFilterData(newFilterData);
		    this.body.SetAngularDamping(.5);

		    //Dampening (linear and angular)
		    this.body.SetLinearDamping(3);//3

		    //Create sounds
		    this.drivingsound = soundManager.createSound({ id: 'player_drive', url: './media/sounds/Tank_Running.wav', volume: 50 });
		    this.enginestartsound = soundManager.createSound({ id: 'player_enginestart', url: './media/sounds/Tank_Startup.wav', volume: 50 });
		    this.drivingsoundlong = soundManager.createSound({ id: 'player_drivelong', url: './media/sounds/Tank_Running_Grity_Long.wav', volume: 50 });
		}

	    //apply perks
		this.applyPerks();
	    //Set max HP
		this.maxhp = this.hp;
		console.log("Map Size:" + ig.game.collisionMap.pxWidth + " " + ig.game.collisionMap.pxHeight);

	    //Apply shadow
		var settings = {
		    zIndex: 180,
		    size: { x: 1, y: 1 },
		    animSheet: new ig.AnimationSheet('media/tankshadow.png', 128, 64),
		}
		var shadow = ig.game.spawnEntity(EntityEyecandy, ig.game.player.pos.x, ig.game.player.pos.y, settings);//
		shadow.attachTo(ig.game.player);
	},
	
	
	update: function () {
	    if (ig.game.startGame == true) {
	        if (this.spawn.ready) {
	            this.respawn();
	        };

	        if (this.handlesInput) {
	            //Is alive and active?
	            if (this.active) {
                    
	                this.parent();
                    if (this.initialAngle.enabled && this.initialAngle.c < 10) {
                        //console.log(JSON.stringify(this.initialAngle));
                        if ((Math.round(this.body.GetAngle() * 100) / 100) != (Math.round(this.initialAngle.angle * 100) / 100)) {

                            this.body.SetAngle(this.initialAngle.angle);
                        } else {
                            this.initialAngle.c++;
                        }
                      if(this.initialAngle.c >= 10){
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
	                if (ig.game.player.abilitySlot1.passive.enabled) {
	                    if (ig.game.player.abilitySlot1.passiveTimer.delta() >= 0) {
	                        ig.game.player.abilitySlot1.applyPassive();
	                        ig.game.player.abilitySlot1.passiveTimer.reset();
	                    }
	                }
	                if (ig.game.player.abilitySlot1.ready == false) {
	                    if (ig.game.player.abilitySlot1.cdtimer.delta() >= 0) {
	                        ig.game.player.abilitySlot1.resetAbility();
	                    }
	                    if (ig.game.player.abilitySlot1.active == true) {
	                        //if (this.collisionFriction.length > 0 && ig.game.player.abilitySlot1.collisiondata.enabled) {
	                        //    //Collision data enabled, so check result

	                        //    //collisiondata: { enabled: false, location: 'front', targetypes: ['netplayer'], effect: { type: 'damage', value: 10 } },
	                        //    //this.collisionFriction.push({ rid: rid, pos: armorpos, reduc: reduction });
	                        //    for (var c = 0; c < this.collisionFriction.length; c++) {
	                        //        if (this.collisionFriction[c].pos == ig.game.player.abilitySlot1.collisiondata.location) {
	                        //            var netent = ig.game.getNetPlayerByRemoteId(this.collisionFriction[c].rid);
	                        //            if (netent != null) {
	                        //                //var ang = ig.game.player.angleTo(netent).toDeg();//This does not work. Only finds the angle of the object to the other object, not their rotation comparision.

	                        //                var playerAngle = Math.round(ig.game.getlimitedAngle(ig.game.player.body.GetAngle().toDeg()));
	                        //                var netentAngle = Math.round(ig.game.getlimitedAngle(netent.body.GetAngle().toDeg()));
	                        //                var anglediff = playerAngle - netentAngle;
	                        //                //Find their angle and compare to player angle to find out which armor was hit.

	                        //                var collisionPoint = 'none';
	                        //                if (anglediff < -135 || anglediff > 135) {
	                        //                    //If their angle is the same +/- 45 deg, then back
	                        //                    collisionPoint = 'front';
	                        //                } else if (anglediff > 45 && anglediff <= 135) {
	                        //                    //If ang < -45 && ang > -135 left,
	                        //                    collisionPoint = 'left';
	                        //                } else if (anglediff > -135 && anglediff <= -45) {
	                        //                    //OR ang < 135 && > 45 then right
	                        //                    collisionPoint = 'right';
	                        //                } else if (anglediff > -45 && anglediff <= 0 || anglediff < 45 && anglediff >= 0) {
	                        //                    //If ang < -135 && > -180 OR ang > 135 && < 180 then front
	                        //                    collisionPoint = 'back';
	                        //                }
	                        //                //What I could do is trigger a remote call when this effect beings, and calculate it clientside for them.. might be better. Run these calcs on a player entity function, but instead of
	                        //                //checking for abilityslot1 collisiondata, just run check the other netplayers to see if they have it enabled.
                            //                //Basically, just check if they have the rhino ability running and if they do, run the effect AGAINST the local player.
	                        //                ig.game.gamesocket.send('dealdamage', {
                            //                    source: ig.game.player.remoteId,
	                        //                    remoteId: this.collisionFriction[c].rid,
	                        //                    armorlocation: collisionPoint,
	                        //                    damage: ig.game.player.abilitySlot1.collisiondata.effect.value,
                            //                    type: 'cannon'
	                        //                });
                                            
	                        //                //Send net damage to net player armor that matches
	                        //                //console.log("Dealing collision damage:", ig.game.player.abilitySlot1.collisiondata.effect.value, collisionPoint);
	                        //            }
	                        //        }
	                        //    }


	                        //}
	                        if (ig.game.player.abilitySlot1.occurence.type == 'reccuring') {
	                            if (ig.game.player.abilitySlot1.effTimer.delta() >= 0) {
	                                //Trigger effect tick
	                                ig.game.player.abilitySlot1.triggerPersistance();
	                            }
	                        } else if (ig.game.player.abilitySlot1.occurence.type == 'triggered') {
	                            if (ig.game.player.abilitySlot1.effTimer.delta() >= 0) {
	                                console.log("triggered ability timer complete");
	                                //remove, since it has expired
	                                ig.game.player.abilitySlot1.removeAbility();
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
	                        var xpos = this.pos.x + (this.size.x / 2 ) + Math.cos(this.body.GetAngle() + Math.PI) * 128;//64 distance
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
	                                    
	                                    this.moveboost = (this.moveboost/2) + this.statusEffects[e].value * 2;
	                                    
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
	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        wpOldData.push(ig.game.player.hardpoints[d].weapon.rofTime);
	                                        ig.game.player.hardpoints[d].weapon.rofTime = Math.round(ig.game.player.hardpoints[d].weapon.rofTime * this.statusEffects[e].value);
	                                        if (ig.game.player.hardpoints[d].weapon.rofTime < 3) { ig.game.player.hardpoints[d].weapon.rofTime = 3; };
	                                    }
	                                    this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: wpOldData });
	                                } else if (this.statusEffects[e].name == 'weapon-reload') {
	                                    var wpOldData = new Array();

	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        wpOldData.push(ig.game.player.hardpoints[d].weapon.reloadTime)
	                                        ig.game.player.hardpoints[d].weapon.reloadTime = Math.round(ig.game.player.hardpoints[d].weapon.reloadTime * this.statusEffects[e].value);
	                                        if (ig.game.player.hardpoints[d].weapon.reloadTime < 1) { ig.game.player.hardpoints[d].weapon.reloadTime = 1; };
	                                        //Reset Reload timer
	                                        ig.game.player.hardpoints[d].weapon.reloadTimer.set(ig.game.player.hardpoints[d].weapon.reloadTime);
	                                        ig.game.player.hardpoints[d].weapon.reloadTimer.pause();
	                                    }
	                                    this.statusEffectsPrevStats.push({ name: this.statusEffects[e].name, oldvalue: wpOldData });
	                                } else if (this.statusEffects[e].name == 'weapon-magsize') {
	                                    //ammoMax
	                                    var wpOldData = new Array();

	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        wpOldData.push(ig.game.player.hardpoints[d].weapon.ammoMax)
	                                        ig.game.player.hardpoints[d].weapon.ammoMax = Math.round(ig.game.player.hardpoints[d].weapon.ammoMax * this.statusEffects[e].value);
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
	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        ig.game.player.hardpoints[d].weapon.rofTime = restoreArray[d];
	                                    }
	                                } else if (this.statusEffects[e].name == 'weapon-reload') {
	                                    var restoreArray = this.getOldStatusData(this.statusEffects[e].name)
	                                    //console.log("Effects old stats:", restoreArray);
	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        ig.game.player.hardpoints[d].weapon.reloadTime = restoreArray[d];
	                                        //Reset Reload timer
	                                        ig.game.player.hardpoints[d].weapon.reloadTimer.set(ig.game.player.hardpoints[d].weapon.reloadTime);
	                                        //ig.game.player.hardpoints[d].weapon.reloadTimer.pause();
	                                    }
	                                } else if (this.statusEffects[e].name == 'weapon-magsize') {
	                                    var restoreArray = this.getOldStatusData(this.statusEffects[e].name)
	                                    //console.log("Effects old stats:", restoreArray);
	                                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	                                        ig.game.player.hardpoints[d].weapon.ammoMax = restoreArray[d];
	                                        ig.game.player.hardpoints[d].weapon.ammoCurrent = restoreArray[d];
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
	                    var settings = { team: ig.game.player.team, isNetClone: false, animations: { idle: [8], firing: [8, 9, 10], bulletID: 2, rof: 1, lifespan: 5 } };

	                    //get Angle adjustment

	                    //Add vectors to get correction / or Generate velocities (math pi is 1/2 of a circle)
	                    var xpos = ig.game.player.chassisArmor4.pos.x + (ig.game.player.chassisArmor4.size.x / 2) + Math.cos(this.body.GetAngle() + Math.PI) * 64;//64 distance
	                    var ypos = ig.game.player.chassisArmor4.pos.y + (ig.game.player.chassisArmor4.size.y / 2) + Math.sin(this.body.GetAngle() + Math.PI) * 64;//64 distance


	                    //chassisArmor4 = back armor
	                    this.defenseDroneEnt = ig.game.spawnEntity(EntityTurret, xpos, ypos, settings);

	                    //Spawn a copy via a network broadcast
	                    ig.game.gamesocket.send('spawnTurret', {
	                        box2dpos: { x: ((xpos) * Box2D.SCALE), y: ((ypos) * Box2D.SCALE) },
	                        settings: settings,
	                        remoteId: ig.game.player.remoteId,
	                        team: ig.game.player.team
	                    });
	                }

	                //Update status timer to ensure 1 second ticks
	                if (this.statusEffectTimer.delta() >= 0) {
	                    this.statusEffectTimer.set(1);
	                }

	                if(this.regen > 0){
	                    if(this.regenTimer.delta() >= 0){
	                        this.regenTimer.reset();
	                        this.hp = this.hp+this.regen;
	                        if(this.hp > this.maxphp){this.hp = this.maxphp};
	                    }
	                }
                    //Work toggle lock camera
	                if (ig.input.pressed('lockCamera')) {
	                    this.lockCamera = !this.lockCamera;
	                }
	                //track camera// -------------[  0  ] -------------------------------
	                if (this.lockCamera) {
	                    ig.game.screen.x = this.pos.x + (this.size.x / 2) - ig.system.width / 2;
	                    ig.game.screen.y = this.pos.y + (this.size.y / 2) - ig.system.height / 2;
	                } else {
	                    //Move screen around
	                    if ((ig.input.mouse.x < 64) || (ig.input.state('screenleft'))) {
	                        //Move left if there is room to move left, and the mouse is within 32 pixels of the left border
	                        //range from player x position
	                        if (ig.game.screen.x > 0) {
	                            if (!(ig.input.state('screenleft'))){
	                                var panmod = ((64 - ig.input.mouse.x) / 64) * this.panrate;
	                            } else {
	                                var panmod = this.panrate;
	                            }
	                            ig.game.screen.x = ig.game.screen.x - panmod;
	                        }
	                    } else if ((ig.input.mouse.x > ig.system.width - 64) || (ig.input.state('screenright'))) {
	                        if (ig.game.screen.x + ig.system.width < ig.game.collisionMap.pxWidth) {
	                            if (!(ig.input.state('screenright'))) {
	                                var panmod = ((64 - (ig.system.width - ig.input.mouse.x)) / 64) * this.panrate;
	                            } else {
	                                var panmod = this.panrate;
	                            }
	                            ig.game.screen.x = ig.game.screen.x + panmod;
	                        }
	                    } 

	                    if ((ig.input.mouse.y < 64) || (ig.input.state('screenup'))) {
	                        if (ig.game.screen.y > 0) {
	                            if (!(ig.input.state('screenup'))) {
	                                var panmod = ((64 - ig.input.mouse.y) / 64) * this.panrate;
	                            } else {
	                                var panmod = this.panrate;
	                            }
	                            ig.game.screen.y = ig.game.screen.y - panmod;
	                        }
	                    } else if ((ig.input.mouse.y > ig.system.height - 64) || (ig.input.state('screendown'))) {
	                        if (ig.game.screen.y + ig.system.height < ig.game.collisionMap.pxHeight) {
	                            if (!(ig.input.state('screendown'))) {
	                                var panmod = ((64 - (ig.system.height - ig.input.mouse.y)) / 64) * this.panrate;
	                            } else {
	                                var panmod = this.panrate;
	                            }
	                            ig.game.screen.y = ig.game.screen.y + panmod;
	                        }
	                    } 

	                    ////Update camera drag if at max optics distance from tank
	                    //if (ig.game.screen.x + ig.system.width / 2 < this.pos.x + this.size.x / 2 - this.optics) {
	                    //    ig.game.screen.x = this.pos.x + this.size.x / 2 - this.optics - ig.system.width / 2;
	                    //}
	                    //if (ig.game.screen.x + ig.system.width / 2 > this.pos.x + this.size.x / 2 + this.optics) {
	                    //    ig.game.screen.x = this.pos.x + this.size.x / 2 + this.optics - ig.system.width / 2;
	                    //}
	                    //if (ig.game.screen.y + ig.system.height / 2 < this.pos.y + this.size.y / 2 - this.optics) {
	                    //    ig.game.screen.y = this.pos.y + this.size.y / 2 - this.optics - ig.system.height / 2;
	                    //}
	                    //if (ig.game.screen.y + ig.system.height / 2 > this.pos.y + this.size.y / 2 + this.optics) {
	                    //    ig.game.screen.y = this.pos.y + this.size.y / 2 + this.optics - ig.system.height / 2;
	                    //}
	                    //Catch any game screen leaving the border
	                    if (ig.game.screen.x < 0) { ig.game.screen.x = 0; };
	                    if (ig.game.screen.x > ig.game.collisionMap.pxWidth - ig.system.width / 2) { ig.game.screen.x = ig.game.collisionMap.pxWidth - ig.system.width / 2; };
	                    if (ig.game.screen.y < 0) { ig.game.screen.y = 0; };
	                    if (ig.game.screen.y > ig.game.collisionMap.pxWidth - ig.system.height / 2) { ig.game.screen.y = ig.game.collisionMap.pxHeight - ig.system.height / 2; };

	                }

                    //Driving
	                if (ig.input.state("forwardGear")) {
	                    this.drive(false);
	                }

	                if (ig.input.state("reverseGear")) {
	                    this.drive(true);
	                }

	                if (ig.input.state("rotateLeft")) {
	                    this.turn(-this.turnRate);
	                }else if (ig.input.state("rotateRight")) {
	                    this.turn(this.turnRate);
	                }

	                if (ig.input.state("breaks")){
	                    this.applyBreaks();
	                }

                    ////Stop Turning
	                if (!ig.input.state("rotateLeft") && !ig.input.state("rotateRight")) {
	                    this.turn(0);
	                }

	                //Play sounds
	                if (ig.input.pressed("forwardGear") || ig.input.pressed("reverseGear")) {
	                    if (!this.engineStarted) {
	                        this.engineStarted = true;
	                        if (this.drivingsoundlong.playState == 0) {
	                            this.enginestartsound.play({
	                                onfinish: function () {
	                                    soundLoop(ig.game.player.drivingsoundlong);
	                                }
	                            });
	                        }
	                    } else {
	                        soundLoop(ig.game.player.drivingsoundlong);
	                    }
	                }
                    //Stop sounds
	                if (ig.input.released("forwardGear") || ig.input.released("reverseGear")) {	                    
	                    this.enginestartsound.stop();
	                    this.drivingsoundlong.stop();
	                }
	                //Reset animation if no driving is happening
	                if (!ig.input.state("forwardGear") && !ig.input.state("reverseGear") && !ig.input.state("rotateLeft") && !ig.input.state("rotateRight")) {

	                    if ((this.hp / this.maxphp) >= .7) {
	                        this.currentAnim = this.anims.idle;
	                    } else if ((this.hp / this.maxphp) < .7 && (this.hp / this.maxphp) >= .3) {
	                        this.currentAnim = this.anims.idleDamaged;
	                    } else if ((this.hp / this.maxphp) < .3 && (this.hp / this.maxphp) >= 0) {
	                        this.currentAnim = this.anims.idleCritical;
	                    } else {
	                        this.currentAnim = this.anims.idle;
	                    }
	                }

	                //Only Broadcast position if alive
	                this.broadcastSync();
	                //this.broadcastPosition();
	                //if (ig.input.pressed('testsync')) {
	                //    console.log("testsync");
	                //    this.broadcastSync();
	                //};
	            }//END OF ACTIVE CHECK


	        } else {
	            //Handle network player effects and updates.

	        }
	    }
	},

	getOldStatusData: function(attrName){
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
	runTankCollisionEffects: function(){
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
	                    armorent = ig.game.player.chassisArmor3;
	                } else if (this.collisionFriction[c].pos == "back") {
	                    armorent = ig.game.player.chassisArmor4;
	                } else if (this.collisionFriction[c].pos == "right") {
	                    armorent = ig.game.player.chassisArmor1;
	                } else if (this.collisionFriction[c].pos == "left") {
	                    armorent = ig.game.player.chassisArmor2;
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
	    var playerAngle = Math.round(ig.game.getlimitedAngle(ig.game.player.body.GetAngle().toDeg()));
	    var netentAngle = Math.round(ig.game.getlimitedAngle(netEnt.body.GetAngle().toDeg()));
	    var anglediff = playerAngle - netentAngle;

	    var relativeCollisionPoint = 'none';
	    //r-l-f-b this.chassisArmor4
	    if (collisionpoint == 'right') {
	        armorent = ig.game.player.chassisArmor1;

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
	        armorent = ig.game.player.chassisArmor2;

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
	        armorent = ig.game.player.chassisArmor3;

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
	        armorent = ig.game.player.chassisArmor4;

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
	addToCollisionTracker: function(rid,enemyArmor,hitArmor){
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
	        if (this.lockCamera) {
	            this.hud_screenlock.drawTile(24, 64, 1, 32);
	        } else {
	            this.hud_screenlock.drawTile(24, 64, 0, 32);
	        }
	        //Handle input driven effects.
	        if (ig.game.hud.hudToggle) {
	            


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
	            this.fontborder.draw(this.playerName, this.pos.x - ig.game.screen.x + 32, this.pos.y - ig.game.screen.y - 48);
	            if (ig.game.hud.hudToggle == 'none') {

	            } else if (ig.game.hud.hudToggle == 'radarRange') {
	                this.drawStealthCircle(context);
	            } else if (ig.game.hud.hudToggle == 'all') {
	                this.drawStealthCircle(context);
	            }

	            ////DRAW OPTICS BORDER
	            //context.beginPath();
	            //context.arc((this.pos.x - ig.game.screen.x + this.size.x / 2) * ig.system.scale, (this.pos.y - ig.game.screen.y + this.size.y / 2) * ig.system.scale, this.optics * ig.system.scale, 0, 2 * Math.PI, false);
	            //context.lineWidth = 1;
	            //context.strokeStyle = '#333333';
	            //context.stroke();

	        }
	    }
	},
	drawStealthCircle: function(context){
	    //DRAW STEALTH BORDER
	    context.beginPath();
	    context.arc((this.pos.x - ig.game.screen.x + this.size.x / 2) * ig.system.scale, (this.pos.y - ig.game.screen.y + this.size.y / 2) * ig.system.scale, this.stealth * ig.system.scale, 0, 2 * Math.PI, false);
	    context.lineWidth = 1;
	    context.strokeStyle = '#B88A00';
	    context.stroke();
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
	effect: function(effecttype){
	    if (effecttype == 'explode') {
	       //console.log("EFFECT FUNCT: TRIGGER EXPLODE");
            var settings = ig.game.db.projectileDbArray[9];

            for (var p = 0; p < 32; p++) {//16 Projectiles, I can work this later.
                //Create projectile with directional impulse. 360/(16-p)
                var angle = (360 / 32) * p;
                //new b2Vec2(50*Math.cos(angle*Math.PI/180),50*Math.sin(angle*Math.PI/180));//Where 50 is the force vel * the angle to coordinate conversion

                var shrapnel = ig.game.spawnEntity(EntityProjectile, Math.round(ig.game.player.pos.x + 5 * Math.cos(angle * Math.PI / 180)), Math.round(ig.game.player.pos.y + 5 * Math.sin(angle * Math.PI / 180)), settings);
                shrapnel.ownerRID =  ig.game.player.remoteId;
                shrapnel.team = ig.game.player.team;
                shrapnel.gravityFactor = 0;
                shrapnel.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(Math.round(15 * Math.cos(angle * Math.PI / 180)), Math.round(15 * Math.sin(angle * Math.PI / 180))), shrapnel.body.GetPosition());

                //Projectile spawn is not working here?? Not sure why
                //ig.game.gamesocket.send('spawnBulletEnt', {
                //    ent: "EntityProjectile",
                //    x: Math.round(ig.game.player.pos.x + 5 * Math.cos(angle * Math.PI / 180)),
                //    y: Math.round(ig.game.player.pos.y + 5 * Math.sin(angle * Math.PI / 180)),
                //    settings: settings,
                //    angle: angle * Math.PI / 180,
                //    remoteId: ig.game.player.remoteId,
                //    team: ig.game.player.team
                //});
                ig.game.gamesocket.sendprojectile({
                    ent: "EntityProjectile",
                    x: Math.round(ig.game.player.pos.x + 5 * Math.cos(angle * Math.PI / 180)),
                    y: Math.round(ig.game.player.pos.y + 5 * Math.sin(angle * Math.PI / 180)),
                    settings: settings,
                    angle: angle * Math.PI / 180,
                    remoteId: ig.game.player.remoteId,
                    team: ig.game.player.team
                });
            }
        }
	},
	hurt: function (damageObj, remoteId) {
	    
	    var scoreIndexDamageTaken = ig.game.getScoreIndexByRemoteId(ig.game.player.remoteId);
	   
        //Player tanked this much damage // having an error with this with friendly fire.
	    if (scoreIndexDamageTaken != -1) {
	        ig.global.scores[scoreIndexDamageTaken].damageTaken = ig.global.scores[scoreIndexDamageTaken].damageTaken + damageObj.hp;
	    }
	    

	    //damageSources - track who did what damage to player
	    var srcfound = -1;
	    for (var d = 0; d < ig.global.scores[scoreIndexDamageTaken].damageSources.length; d++) {
	        if (ig.global.scores[scoreIndexDamageTaken].damageSources[d].remoteId == remoteId) {
	            srcfound = d;
	            break;
	        }
	    }
	    var srcfoundthislife = -1;
	    for (var f = 0; f < this.scoreTrackingPerLife.damageSources.length; f++) {
	        if (this.scoreTrackingPerLife.damageSources[f].remoteId == remoteId) {
	            srcfoundthislife = f;
	            break;
	        }
	    }
	    //Is this damage from a new source??
	    if (srcfound == -1) {
            //Yes, then push the new source in
	        ig.global.scores[scoreIndexDamageTaken].damageSources.push({ remoteId: remoteId, damage: damageObj.hp })
	    } else {
	        //No, then update the found remote id
	        ig.global.scores[scoreIndexDamageTaken].damageSources[srcfound].damage = ig.global.scores[scoreIndexDamageTaken].damageSources[srcfound].damage + damageObj.hp;
	    }
	    if (srcfoundthislife == -1) {
	        //Yes, then push the new source in
	        this.scoreTrackingPerLife.damageSources.push({ remoteId: remoteId, damage: damageObj.hp });
	    } else {
	        //No, then update the found remote id
	        this.scoreTrackingPerLife.damageSources[srcfoundthislife].damage = this.scoreTrackingPerLife.damageSources[srcfoundthislife].damage + damageObj.hp;
	    }
	    //Spawn Defense drone if trait exists and drone is null (not alive)
	    if (this.hasDefenseDrone) {
	        if (this.defenseDroneEnt == null) {
	            this.defenseDroneSpawnReady = true;
	        }
	    }
	    
	    
	},
	death: function (killerRemoteId) {
	    if (this.deathEffect == 'explode') {
	        //console.log("DEATH FUNCT: TRIGGER EXPLODE");
	        this.performDeathEffect = true;	        
	    }
	    this.hp = 0;
        //Get score index of killer and player
	    var scoreIndexKill = ig.game.getScoreIndexByRemoteId(killerRemoteId);
	    console.log("playerDeath", scoreIndexKill);
	    var scoreIndexDeath = ig.game.getScoreIndexByRemoteId(ig.game.player.remoteId);

	    //update death count of player, and update kill score for killer
	    ig.global.scores[scoreIndexDeath].deaths = ig.global.scores[scoreIndexDeath].deaths + 1;
	    console.log("Death by Killer (substring.(0,3)", killerRemoteId, killerRemoteId.substring(0,3));
        //Dont do the following for bots, as they dont have a tracked score.
	    if(killerRemoteId.substring(0,3) != "bot"){
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
	    }
	    //Emit Death Update for other players to see
	    this.grantDeathScore(ig.game.player.remoteId);


	    //Announce death
	    ig.game.gamesocket.announce({ text: this.playerName + " got killed!" });
	    ig.game.gamesocket.send('killed', { remoteId: this.remoteId, playerName: this.playerName });
	    this.active = false;
	    //saved into HUD report
	    ig.game.hud.deathreport = ig.copy(this.scoreTrackingPerLife.damageSources);
	    for (var i = 0;i<ig.game.hud.deathreport.length;i++){
	        var player = ig.game.getScoreIndexByRemoteId(ig.game.hud.deathreport[i].remoteId);
	        if (player != null && player != -1) {
	            ig.game.hud.deathreport[i].playerName = ig.global.scores[player].playerName;
	        }else{
				ig.game.hud.deathreport[i].playerName = killerRemoteId;
			}
	    }
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
        //Deactivate Armors to remove Draw/Update
	    this.chassisArmor1.active = false;
	    this.chassisArmor2.active = false;
	    this.chassisArmor3.active = false;
	    this.chassisArmor4.active = false;
	    //Deactivate Hardpoints to remove Draw/Update, Remove targeting and behavior modes
	    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	        ig.game.player.hardpoints[d].weapon.active = false;
	        //ig.game.player.hardpoints[d].weapon.pointTarget.pos = { x: this.pos.x, y: this.pos.y };
	        ig.game.player.hardpoints[d].weapon.behavior = 1;
	    }
	    //Set camera position' zone.pos.x + zone.size.x / 2, zone.pos.y + zone.size.y / 2
	    if (this.team == 2) {
	        var zone = ig.game.getEntityByName('team2spawn');
	    } else {
	        var zone = ig.game.getEntityByName('team1spawn');
	    };
	    ig.game.screen.x = zone.pos.x + zone.size.x / 2;
	    ig.game.screen.y = zone.pos.y + zone.size.y / 2;
	    //Set respawn timer
	    //base off of clock
	    if (ig.global.playerIsHost == false) {
	        var totalseconds = Math.round(ig.game.startGameClock.clienttime + ig.game.startGameClock.clock.delta());
	    } else {
	        var totalseconds = Math.round(ig.game.startGameClock.clock.delta())
	    }
	    ig.game.hud.playerRespawnTimer.set((5+Math.round((this.maxphp/4)/10))+(Math.round(totalseconds/60)*3)*this.respawnBonus);
	},
	grantAssistScore: function (remoteId) {
	    //console.log("Grant assist for " + remoteId);
	    ig.game.gamesocket.send('scoreassist', {
	        remoteId: remoteId,
	    });
	},
	grantDeathScore: function (remoteId) {
	    //console.log("Grant death for " + remoteId);
	    ig.game.gamesocket.send('scoredeath', {
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
	configChassisSetPosition: function(b2vector){
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
	        var classObjectCopy = JSON.parse(JSON.stringify(ig.global.class));
	        //console.log("JSON PARSE OF SPAWN: " + JSON.stringify(ig.global.class) );

	        ig.game.gamesocket.send('netrespawn', {
	            spawnpos: { x: x, y: y },
	            remoteId: this.remoteId,
	            playerName: this.playerName,
	            hardpoints: ig.global.class.hardpoints,
	            stealth: this.stealth,
	            optics: this.optics,
	            classType: this.classType,
	            classId: ig.global.class.classid,
	            density: this.density,
	            team: this.team,
	        });
	    }
	}, 
	respawn: function () {
	    //console.log("player spawn");
	    ig.game.hud.playerRespawnTimer.pause();
	    this.spawn.ready = false;
	    //Need respawn zones. Respawn zones should offer passive armor and hull regen to any friendly in them.


	    var spPosX = (this.spawn.x - (this.size.x / 2)) * Box2D.SCALE;
	    var spPosY = (this.spawn.y - (this.size.y / 2)) * Box2D.SCALE;
	    //Set position of all player componenets
	    ig.game.player.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    ig.game.player.chassisArmor1.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    ig.game.player.chassisArmor2.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    ig.game.player.chassisArmor3.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    ig.game.player.chassisArmor4.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	        ig.game.player.hardpoints[d].weapon.body.SetPosition(new Box2D.Common.Math.b2Vec2(spPosX, spPosY));
	    }
        //Wake up
	    this.active = true;
	    this.body.SetAwake(true);
        //Set Velocities
	    this.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));
	    this.body.SetAngularVelocity(0);
        
        //Set angles
        if (this.team == 2) {
            console.log("SettingAngleBEFORE", this.body.GetAngle());
            //this.body.SetPositionAndAngle(this.body.GetPosition(), (1*Math.PI));
            this.body.SetAngle((Math.PI));
            console.log("SettingAngleAFTER", this.body.GetAngle());
            for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
	            ig.game.player.hardpoints[d].weapon.body.SetAngle((Math.PI));
	        }
            this.initialAngle.enabled = true;
            this.initialAngle.angle = Math.PI;
        }else{
            
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
	    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
            //Update weapons to active and refill ammo
	        ig.game.player.hardpoints[d].weapon.active = true;
            ig.game.player.hardpoints[d].weapon.ammoCurrent = ig.game.player.hardpoints[d].weapon.ammoMax;
	    }
	    ig.game.attackpoint.body.SetPosition(new Box2D.Common.Math.b2Vec2(this.body.GetPosition().x, this.body.GetPosition().y));
	    //Reset ability just to keep the cooldowns correct
	    this.abilitySlot1.reinit();
	},
	stopMovement: function(){
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
	applyPerks: function(){
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
	gatherWeaponAngles: function(){
	    var wpsAngles = new Array();
	    for (var w = 0; w < this.hardpoints.length; w++) {
	        var a = this.hardpoints[w].weapon.body.GetAngle().round(2);
	        wpsAngles.push(a);
	    }	   
	    return wpsAngles;
	},
	broadcastSync: function () {
	    var linearVel = this.body.GetLinearVelocity();
	    var originPoints = { x: this.pos.x + this.size.x / 2, y: this.pos.y + this.size.y / 2 };
	    var wpAnglesString = JSON.stringify(this.gatherWeaponAngles());
	    ig.game.gamesocket.statesync('move', {
	        pos: originPoints,
	        linearVel: linearVel,
	        remoteAnim: this.remoteAnim,
	        remoteId: this.remoteId,
	        angle: this.body.GetAngle().round(2),
	        wpangles: wpAnglesString,
	        health: { current: this.hp, max: this.maxphp },
	        //armor: {
	        //    f: this.chassisArmor3.pos,
	        //    fv: this.chassisArmor3.body.GetLinearVelocity(),
	        //    b: this.chassisArmor4.pos,
	        //    bv: this.chassisArmor4.body.GetLinearVelocity(),
	        //    r: this.chassisArmor1.pos,
	        //    rv: this.chassisArmor1.body.GetLinearVelocity(),
	        //    l: this.chassisArmor2.pos,
	        //    lv: this.chassisArmor2.body.GetLinearVelocity(),
	        //},
	    });

	},
	broadcastPosition: function () {
	    //console.log("linearVelocity: X:" + this.body.GetLinearVelocity().x + " Y:" + this.body.GetLinearVelocity().y);
	    var linearVel = this.body.GetLinearVelocity();
	    var originPoints = { x: this.pos.x + this.size.x / 2, y: this.pos.y + this.size.y / 2 };
	    var wpAnglesString = JSON.stringify(this.gatherWeaponAngles());
	    ig.game.gamesocket.send('move', {
	        pos: originPoints,
	        linearVel: linearVel,
	        remoteAnim: this.remoteAnim,
	        remoteId: this.remoteId,
	        angle: this.body.GetAngle().round(2),
	        wpangles: wpAnglesString,
	        health: { current: this.hp, max: this.maxphp },
	        armor: {
	            f: this.chassisArmor3.pos,
	            b: this.chassisArmor4.pos,
	            r: this.chassisArmor1.pos,
	            l: this.chassisArmor2.pos,
	        },
	    });
	    
	},
	broadcastApplyImpulse: function (xVel, yVel) {
	     
	    ig.game.gamesocket.send('impulse', {
	        vel: {x: xVel, y: yVel},
	        remoteAnim: this.remoteAnim,
	        remoteId: this.remoteId,
	        flipped: this.flip,
	    });

	},
});


});