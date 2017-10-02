ig.module(
	'game.entities.botarmor'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityBotarmor = ig.Box2DEntity.extend({
        size: { x: 128, y: 8 },
        zIndex: 200,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        density: 2,
        active: true,
        name: "armor",
        bodyType: 'dynamic',
        animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 128, 8),
        font: new ig.Font('media/04b03.font.png'),
        tileSeries: [0],
        generateImpactParticle: { state: false, type: 'bullet', position: { x: 0, y: 0 } },
        hp: 100,
        maxhp: 100,
        mp: 100,
        moraleTimer: null,
        armorPosition: "none",
        owner: null,
        hardpointsBound: new Array(),
        damageQueue: new Array(),
        reduction: { explosive: .9, fire: .1, bullet: .1, cannon: .5 },//How much does it reduce damage while up.
        categoryBits: ig.global.COL_BOT_ARMOR,      // collsion type localBullet, 0x0010 for netbullet
        maskBits: ~ig.global.COL_BULLET_LOCAL && ~ig.global.COL_BULLET_NET && ~ig.global.COL_BOT,        // DOES NOT COLLIDE WITH 0x0008(localbullet) or netbullet and DOES collide with Player, NetArmor
        
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('full', 1, [0]);
            this.addAnim('lightDamage', 1, [1]);
            this.addAnim('medDamage', 1, [2]);
            this.addAnim('highDamage', 1, [3]);
            this.addAnim('fullDamage', 1, [4]);
            this.currentAnim = this.anims.full;
            if (!ig.global.wm) {
                this.body.gravityScale = 0;
                //this.body.SetFixedRotation(true);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                //newFilterData.groupIndex = -5;//-9 Bot Stuff
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);

                this.body.userData = "botarmor";
            }
            this.moraleTimer = new ig.Timer();
            this.moraleTimer.set(.5);
            //Set hp values
            this.maxhp = this.hp;
        },

        update: function () {
            if (ig.game.startGame == true) {
                if (this.active) {
                    this.parent();
                    //Recover Morale for this armor
                    if (this.mp < 100) {
                        if (this.moraleTimer.delta() > 0) {
                            this.mp++;
                            this.moraleTimer.set(.5);
                        }
                    }

                    if (this.generateImpactParticle.state) {
                        this.generateImpactParticle.state = false;
                        
                        this.hurtEffectGeneration(this.generateImpactParticle.type);
                    }
                }
                if (this.damageQueue.length > 0) {
                   
                    for (var d = 0; d < this.damageQueue.length; d++) {
                        //console.log("damage queue", this.damageQueue[d].dam);
                        this.hurtArmor(this.damageQueue[d].dam, this.damageQueue[d].type, this.damageQueue[d].rid);
                    }
                    this.damageQueue.length = 0;
                    this.damageQueue = [];
                }
            }
            
        },
        draw: function () {
            
            if (this.active) {
                //this.parent();

                //DEBUG DRAWS
                //Dont Draw Armor, as it is just used for detection
                //this.font.draw(this.armorPosition + "  :  Morale:" + this.mp, this.pos.x - ig.game.screen.x, this.pos.y - ig.game.screen.y);
            }
        },
        hurtEffectGeneration: function (type) {
            //What stat effects if any from a specific damage type?
            if (type == 'bullet') {

            } else if (type == 'cannon') {

            } else if (type == 'explode') {

            } else if (type == 'fire') {
            }
        },
        hurtArmor: function (damage, type, remoteId) {
            if (damage.hp != undefined) {
                if (this.owner.active) {
                    //generate sparks for hitting armor random chance.
                    //Later, attach thist to graphics options and on none, turn this off.
                    if (this.generateImpactParticle.state == false) {
                        this.generateImpactParticle.state = true;
                        this.generateImpactParticle.type = type;
                    }
                    //Find Source of damage
                    var ent = null;
                    var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                    for (var i in tEntities) {
                        if (tEntities[i].remoteId === remoteId) {
                            ent = tEntities[i];
                        }
                    }
                    //Sets defensive targeting, but not needed for bots
                    //if (ent != null) {
                    //    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
                    //        if (ig.game.player.hardpoints[d].weapon.behavior == 2) {
                    //            //console.log("Assigning defensive target:" + ent.remoteId);
                    //            ig.game.player.hardpoints[d].weapon.lastTarget = ent;
                    //        }
                    //    }
                    //}
                    var fullDamage = ig.copy(damage);
                    //Reduce Damage if armor is still around
                    //console.log("damageBefore",damage);
                    damage = this.reduceDamage(damage, type);
                    //console.log("damageAfter", damage);
                    if (this.hp > 0) {
                        //Track damage on player
                        //ig.game.player.hurt(damage, remoteId);
                        //Armor takes the damage instead of hull. hull takes the reduced amount.
                        this.hp = this.hp - (fullDamage.hp - damage.hp);

                        if (this.hp < 0) { this.hp = 0; };

                        //Update armor animation
                        if ((this.hp / this.maxhp) >= .75 && (this.hp / this.maxhp) < 1) {
                            this.currentAnim = this.anims.lightDamage;
                        } else if ((this.hp / this.maxhp) >= .5 && (this.hp / this.maxhp) < .75) {
                            this.currentAnim = this.anims.medDamage;
                        } else if ((this.hp / this.maxhp) >= 0 && (this.hp / this.maxhp) < .5) {
                            this.currentAnim = this.anims.highDamage;
                        } else if ((this.hp / this.maxhp) <= 0) {
                            this.currentAnim = this.anims.fullDamage;
                        }
                        //player HULL damage. They take the reduced amount
                        //Track damage on tank
                        console.log("damage", damage, remoteId, type);
                        this.owner.hurt(damage, remoteId);
                        this.owner.hp = this.owner.hp - damage.hp;
                        if (this.owner.hp <= 0) {
                            this.owner.hp = 0;
                            //Kill Player for respawn   
                            this.owner.death(remoteId);

                        };
                    } else {
                        //Player takes full damage because they lack armor there.
                        //Track damage on player
                        this.owner.hurt(fullDamage, remoteId);
                        this.owner.hp = this.owner.hp - fullDamage.hp;
                        if (this.owner.hp <= 0) {
                            this.owner.hp = 0;
                            //Kill Player for respawn                             
                            this.owner.death(remoteId);

                        };

                    }


                }
            } else {
                console.log("bot damage.hp undefined", damage, type, remoteId);
            }
        },

        reduceDamage: function (damage, type) {
            var newDamage = damage;
            if (this.hp > 0) {
                if (type == 'bullet') {
                    newDamage.hp = damage.hp * this.reduction.bullet;
                } else if (type == 'cannon') {
                    newDamage.hp = damage.hp * this.reduction.cannon;
                } else if (type == 'fire') {
                    newDamage.hp = damage.hp * this.reduction.fire;
                } else if (type == 'explode') {
                    newDamage.hp = damage.hp * this.reduction.explosive;
                }
            }
            return newDamage;
        },

        setupArmorToHPxRef: function () {
            //Setup the indexes of the hardspoints which this armor affects.
            var searchChar = 0;
            if (this.armorPosition == 'back') {
                searchChar = 'B';
            } else if (this.armorPosition == 'front') {
                searchChar = 'F';
            } else if (this.armorPosition == 'left') {
                searchChar = 'L';
            } else if (this.armorPosition == 'right') {
                searchChar = 'R';
            }
            for (var d = 0; d < this.owner.hardpoints.length; d++) {                
                if (this.owner.hardpoints[d].location.indexOf(searchChar) != -1) {
                    this.hardpointsBound.push(d);//Push index of hardpoint attached to this armor
                }
            }
        },
    });

});