ig.module(
	'game.ability'
)
.requires(
	'impact.game'
).defines(function () { //"use strict";

    ability = ig.Class.extend({

        name: 'EmptyAbility',
        id: 0,
        cooldown: 15,
        active: false,
        ready: true,
        cdtimer: null,
        effTimer: null,
        passiveTimer: null,
        effTotal: 0,
        
        occurence: { type: 'reccuring', effecttime: 1, ticks: 0, totalticks:1 },
        //Is it a duration(on for a time), reccuring(ever x seconds), passive, triggered, delayed, toggled ability? This triggers the apply.
        //How long does the effect last, 0 for single shot.

        triggerEvent: { type: 'active', source: 'key' },//active - left click, right click, key. Passive -Damage HP, Damage Armor, Condition, Collision,

        //Types: Stat - Modifiy stats. Projectile - Create projectile somewhere. Entity - Create entity of some kind.
        //Collision: Modify collision type. Body - Modify physics (set position, apply impulse,etc)
      

        //persistance
        initial: {},//What is the effect type of the inital call?
        persistance: {}, //What of it's effect types just it trigger for each tick of persistance
        passive: { enabled: false, effects: [], effecttime: 1 },
        //Targets: Self, ally, enemy, objective, entity (for example, mouse to teleport)
        target: { etype: [], ents: new Array(), source: 'self', value: 300 },//,'Self',Ally,Enemy and 'closest','bydistance' for source
        //What eyecandy effect shows up? Comes from an eyecandy database call
        visualEffect: {initial: 0, persistance: 0, passive: 0},
        //Does the target get a new animation? (For example, rhino armor glows red.)
        tilesetmod: 'none',

        //Specifics
        //projectiles
        projectile: { Id: 11, Count: 1, Action: 'bullet', origin: 'back', anglemod: 180, firepattern: { type: 'line', rate: 0 } }, //Explosion, Bullet. fire pattons are the spread or the pattern for projectiles with counts higher than 1.
        //Line - Straight, with rate determining space ahead of the original point: x1 -- x2 -- x3
        //Radial - Starting at the anglemod, it begins it circle pattern with rate the angle between each shot.
        //Spread - Starting on the center and alternating between perpendicular spots     x2 -- x1 -- x3
        //Random - Random within the rate distance area.
        //stats
        statstomod: [],
        //listenertarget - if the player reads the ability as active, with a passive occurence, then it checks each frame for a change to the targeted object property. If it changes, then it triggers.
        //entity
        entityCreate: null,//{type: type, settings:{}}
        //collision
        collisiondata: { enabled: false, location: 'front', targetypes: ['netplayer'], effect: { type: 'damage', value: 10 } },
        //Body
        bodymod: [], //Position, Velocity, Impulse, AngVel, AngImpulse, AngPos {type: 'setposition' / 'impulse', value: null}
        //Use Placement Marker
        placementEnt: { },//{ent: type, settings:{}} //placementType: 'AbilityCreateEnt'

        init: function (settings) {
            ig.merge(this, settings);
            //Setup Timers

            this.cdtimer = new ig.Timer(this.cooldown);
            this.effTimer = new ig.Timer(this.occurence.effecttime);
            if (this.passive.enabled) {
                this.passiveTimer = new ig.Timer(this.passive.effecttime);
            }
            //freeze both until called
            this.cdtimer.pause();
            this.effTimer.pause();
            this.effTotal = this.occurence.effecttime * this.occurence.totalticks;


        },
        reinit: function(){
            this.cdtimer.set(this.cooldown);
            this.effTimer.set(this.occurence.effecttime);

            this.cdtimer.pause();
            this.effTimer.pause();
            this.occurence.ticks = 0;
            this.active = false;
            this.ready = true;
        },
        triggerAbility: function(){
            //Checking of the correct type is done elsewhere.
            //console.log("Trigger Ability Inital");
            this.ready = false;            
            this.cdtimer.set(this.cooldown);


            this.effTimer.set(this.occurence.effecttime);
            this.active = true;
            for (var t = 0; t < this.initial.targets.length; t++) {
                this.getTargets(this.initial.targets[t]);
                this.applyAbility(this.initial.effects);
            }

        },
        triggerPersistance: function(){
            //console.log("Trigger Ability Persistance");
            this.occurence.ticks++;
            this.effTimer.set(this.occurence.effecttime);
            if (this.occurence.ticks == this.occurence.totalticks) {
                //Ability has reach the max occurence so end it.
                this.removeAbility();
            }
            for (var t = 0; t < this.persistance.targets.length; t++) {
                this.getTargets(this.persistance.targets[t]);
                this.applyAbility(this.persistance.effects);
            }
        },
        getTargets: function(targType){            
            this.clearTargets();
            //Requires Target (Self,Enemy, Ally)
            if (targType == 'Self') {
                //console.log("AbilityTargetAssigned: Self");
                this.target.ents = [{ ent: ig.game.player, oldstats: new Array() }];

            } else if (targType == 'Enemy') {
                //How is this target being obtained?
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                var dis = 9999;
                for (var i in tEntities) {
                    if (tEntities[i].team != ig.game.player.team) {
                        if (this.target.source == 'distance') {
                            if (tEntities[i].distanceTo(ig.game.player) <= this.target.value) {
                                //Close enough, so push
                                this.target.ents.push({ ent: tEntities[i], oldstats: new Array() })
                            }
                        } else if (this.target.source == 'closest') {
                            if (tEntities[i].distanceTo(ig.game.player) < dis) {
                                this.target.ents = [{ ent: tEntities[i], oldstats: new Array() }];
                                dis = tEntities[i].distanceTo(ig.game.player);
                            }
                            
                        } else {
                            //On the right team when triggered, so push
                            this.target.ents.push({ ent: tEntities[i], oldstats: new Array() })
                        }
                        
                    }
                }
            } else if (targType == 'Ally') {
                //How is this target being obtained?                
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                var dis = 9999;
                for (var i in tEntities) {
                    if (tEntities[i].team == ig.game.player.team) {

                        if (this.target.source == 'distance') {
                            if (tEntities[i].distanceTo(ig.game.player) <= this.target.value) {
                                //Close enough, so push
                                this.target.ents.push({ ent: tEntities[i], oldstats: new Array() })
                            }
                        } else if (this.target.source == 'closest') {
                            //Find closest enemy and make them the target
                            if (tEntities[i].distanceTo(ig.game.player) < dis) {
                                this.target.ents = [{ ent: tEntities[i], oldstats: new Array() }];
                                dis = tEntities[i].distanceTo(ig.game.player);
                            }

                        } else {
                            //On the right team when triggered, so push
                            this.target.ents.push({ ent: tEntities[i], oldstats: new Array() })
                        }
                    }
                }

            } else if (targType == 'ground') {
                //How is this target being obtained?
                this.target.ents = [{ ent: ig.game.mousePointer, oldstats: new Array() }];
            } 
        },
        applyAbility: function (effectarray) {
            for (var a = 0; a < effectarray.length; a++) {
                if (effectarray[a] == 'statstomod') {
                    //console.log("Ability Applying stat mod");
                    this.setStatMod();
                } else if (effectarray[a] == 'projectile') {
                    this.createProjectile();
                } else if (effectarray[a] == 'entity') {
                    //create placement ent
                    this.setPlacement();


                } else if (effectarray[a] == 'collision') {
                    this.setCollisionEffect();
                } else if (effectarray[a] == 'body') {
                    //create placement ent
                    this.setPlacement();
                }
            }
            //run visual effects
            if (this.visualEffect != 0) {
                //Send broadcast
                ig.game.gamesocket.send('applyAbilityEffect', {
                    rid: ig.game.player.remoteId,
                    applyTo: this.visualEffect.applyTo,
                    effectIndex: this.visualEffect.effect,
                    attached: this.visualEffect.attached
                });

                if (this.visualEffect.applyTo == 'weapons') {
                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
                        //Create effect
                        var weapon = ig.game.player.hardpoints[d].weapon;
                        var settings = ig.game.db.eyeCandyDBArray[this.visualEffect.effect];
                        var eff = ig.game.spawnEntity(EntityEyecandy, weapon.pos.x, weapon.pos.y, settings);//
                        //Attach to weapon
                        if (this.visualEffect.attached) {
                            eff.attachTo(weapon);
                        }

                    }
                } else if (this.visualEffect.applyTo == 'self') {
                    var settings = ig.game.db.eyeCandyDBArray[this.visualEffect.effect];
                    var eff = ig.game.spawnEntity(EntityEyecandy, ig.game.player.pos.x, ig.game.player.pos.y, settings);//
                    if (this.visualEffect.attached) {
                        eff.attachTo(ig.game.player);
                    }
                } else if (this.visualEffect.applyTo == 'target') {

                }
            }

        },
        setPlacement: function () {
            //For placement, dot run timers until I place it
            this.cdtimer.pause();
            this.effTimer.pause();
            this.active = false;
            //Generate Entity
            if (this.placementEnt.ent != null && this.placementEnt.ent != undefined && this.placementEnt.ent != 'EntityPlacement') { this.placementEnt.ent.kill() };
            this.placementEnt.ent = ig.game.spawnEntity(EntityPlacement, 0, 0, this.placementEnt.settings);
            this.placementEnt.ent.sourceAbility = this;
            //Set mouse to placement mode
            ig.game.mousePointerBox2d.mode = 'placement';
        },
        applyPassive: function () {
            for (var t = 0; t < this.passive.targets.length; t++) {
                this.getTargets(this.passive.targets[t]);
                this.applyAbility(this.passive.effects);
            }
        },
        resetAbility: function () {
            //Once it is off cooldown and ready again
            this.ready = true;
            this.cdtimer.pause();
            this.removeAbility();
        },
        removeAbility: function () {
            this.effTimer.pause();
            this.occurence.ticks = 0;
            this.active = false;

            //Need to clear any thing that is saved by the ability and restore the ability back to a starting state.
            for (var a = 0; a < this.initial.effects.length; a++) {
                if (this.initial.effects[a] == 'stat') {
                    this.clearStatMod();
                } else if (this.initial.effects[a] == 'projectile') {

                } else if (this.initial.effects[a] == 'entity') {
                    //remove placement ent if not already null
                } else if (this.initial.effects[a] == 'collision') {
                    this.clearCollisionEffect();
                } else if (this.initial.effects[a] == 'body') {
                    //remove placement ent if not already null
                }
            }
            if (this.persistance != null) {
                for (var a = 0; a < this.persistance.effects.length; a++) {
                    if (this.persistance.effects[a] == 'stat') {
                        this.clearStatMod();
                    } else if (this.persistance.effects[a] == 'projectile') {

                    } else if (this.persistance.effects[a] == 'entity') {
                        //remove placement ent if not already null
                    } else if (this.persistance.effects[a] == 'collision') {
                        this.clearCollisionEffect();
                    } else if (this.persistance.effects[a] == 'body') {
                        //remove placement ent if not already null
                    }
                }
            }
        },
        setPhysics: function (b2vector) {
            //Requires: Body, Action
            //console.log("Settings physics for", this.bodymod, b2vector);
            for (var p = 0; p < this.bodymod.length; p++) {
                if (this.bodymod[p].type == 'setposition-player') {
                    for (var e = 0; e < this.target.ents.length; e++) {
                        var targetEnt = this.target.ents[e];
                        targetEnt.ent.configChassisSetPosition(b2vector);

                    }
                } else if (this.bodymod[p].type == 'impluse') {
                    for (var e = 0; e < this.target.ents.length; e++) {
                        var targetEnt = this.target.ents[e];
                        targetEnt.ent.body.ApplyForce(new Box2D.Common.Math.b2Vec2(b2vector), targetEnt.body.GetPosition());

                    }
                }
            }

        },
        setCollisionEffect: function () {
            //Requires Body, ActionType, Value, TargetTypes[]
            this.collisiondata.enabled = true;
            ig.game.gamesocket.send('setcollisionstatus', {
                remoteId: ig.game.player.remoteId,
                collisiondata: this.collisiondata
            });

        },
        setStatMod: function () {
            //ArrToMod[{stat,value}]         
            //console.log("Current mods to set", this.statstomod);
            var broadcastArray = new Array();
            for (var e = 0; e < this.target.ents.length; e++) {
                var targetEnt = this.target.ents[e];
                //If Netplayer, broadcast, if local just apply
                if (targetEnt.ent instanceof EntityPlayer) {
                    //Player
                    for (var s = 0; s < this.statstomod.length; s++) {
                        //stat: 'movespeed', value: 8 , secondsDuration: 1
                        targetEnt.ent.addStatusEffect(this.statstomod[s].stat, this.statstomod[s].secondsDuration, this.statstomod[s].value, false)   
                    }
                } else {
                    //Netplayer
                    broadcastArray.push({
                        remoteId: targetEnt.ent.remoteId                        
                    })
                }
            }

            if (broadcastArray.length > 0) {
                //Do net broadcast with broadcast array                
                ig.game.gamesocket.send('applystatuseffects', {
                    remoteIdArray: broadcastArray,
                    statEffect: { statstomod: this.statstomod, reapply: false }
                });
            }
        },
        createProjectile: function () {
            //Requires creation origin, vel, count, areatype (radial, line, arc, spread)
            var fireAngle = 0;
            var x = 0;
            var y = 0;
            if (this.projectile.origin == 'self') {
                x = ig.game.player.pos.x + ig.game.player.size.x / 2;
                y = ig.game.player.pos.y + ig.game.player.size.y / 2;

                fireAngle = ig.game.player.body.GetAngle();

            } else if (this.projectile.origin == 'front') {
                //Would grab the first ent in the target array
                var targetEnt = ig.game.player.chassisArmor3;
                x = targetEnt.pos.x + targetEnt.size.x / 2;
                y = targetEnt.pos.y + targetEnt.size.y / 2;;

                fireAngle = targetEnt.body.GetAngle();

            } else if (this.projectile.origin == 'back') {
                //Would grab the first ent in the target array
                var targetEnt = ig.game.player.chassisArmor4;
                x = targetEnt.pos.x + targetEnt.size.x / 2;
                y = targetEnt.pos.y + targetEnt.size.y / 2;

                fireAngle = targetEnt.body.GetAngle();

            } else if (this.projectile.origin == 'target') {
                //Would grab the first ent in the target array
                var targetEnt = this.target.ents[0];
                x = targetEnt.pos.x + targetEnt.size.x / 2;
                y = targetEnt.pos.y + targetEnt.size.y / 2;

                fireAngle = targetEnt.body.GetAngle();

            } else if (this.projectile.origin == 'mouse') {
                x = ig.game.mousePointer.pos.x + ig.game.mousePointer.size.x / 2;
                y = ig.game.mousePointer.pos.y + ig.game.mousePointer.size.y / 2;

                fireAngle = ig.game.player.angleTo(ig.game.mousePointer);
            }

            fireAngle = fireAngle + this.projectile.anglemod.toRad();


            for (var p = 0; p < this.projectile.Count; p++) {

                if (this.projectile.firepattern.type == 'radial') {
                    fireAngle = fireAngle + p * this.projectile.firepattern.rate.toRad();
                }

                var bulletSettings = ig.game.db.projectileDbArray[this.projectile.Id];

                var bullet = ig.game.spawnEntity(EntityProjectile, x, y, bulletSettings);
                bullet.owner = ig.game.player;
                bullet.ownerRID = ig.game.player.remoteId;
                bullet.team = ig.game.player.team;
                if (this.projectile.Action == 'bullet') {
                    var fireResult = bullet.fire(fireAngle, ig.game.player.remoteId, ig.game.player.team);//fire projectile

                    //Multiplayer Transmit
                    //ig.game.gamesocket.send('spawnBulletEnt', {
                    //    ent: "EntityProjectile",
                    //    x: x,
                    //    y: y,
                    //    settings: bulletSettings,
                    //    angle: fireAngle,
                    //    remoteId: ig.game.player.remoteId,
                    //    team: ig.game.player.team
                    //});
                    ig.game.gamesocket.sendprojectile({
                        ent: "EntityProjectile",
                        x: x,
                        y: y,
                        settings: bulletSettings,
                        angle: fireAngle,
                        remoteId: ig.game.player.remoteId,
                        team: ig.game.player.team
                    });
                } else if (this.projectile.Action == 'hitscan') {

                    //Multiplayer Transmit
                    ig.game.gamesocket.send('spawnHitScan', {
                        ent: "EntityProjectile",
                        x: x,
                        y: y,
                        bulletId: this.projectile.Id,
                        remoteId: ig.game.player.remoteId,
                        team: ig.game.player.team
                    });
                }
            }
        },
        createEntity: function () {
            //Requires entity type, position, settings
        },
        clearCollisionEffect: function () {
            this.collisiondata.enabled = false;
            ig.game.gamesocket.send('setcollisionstatus', {
                remoteId: ig.game.player.remoteId,
                collisiondata: this.collisiondata
            });
        },
        clearStatMod: function () {
            //for (var e = 0; e < this.target.ents.length; e++) {
            //    var targetEnt = this.target.ents[e];
            //    //Reset back to original values. May have to still tie this into the database and reapply perks to keep things clean. But for now, do this.
            //    for (var s = 0; s < targetEnt.oldstats.length; s++) {
            //        console.log("Clear stat: Before:", targetEnt.ent[targetEnt.oldstats[s].stat]);
            //        targetEnt.ent[targetEnt.oldstats[s].stat] = targetEnt.oldstats[s].value;
            //        console.log("Clear stat: Before:", targetEnt.ent[targetEnt.oldstats[s].stat]);
            //    }
            //}
            this.clearTargets();
        },
        clearTargets: function(){
            //Clear targeting array
            this.target.ents = [];
            this.target.ents.length = 0;
        },
        clearProjectile: function () {

        },
        clearEntity: function () {

        }
    });


});