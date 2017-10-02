ig.module(
	'game.entities.turret'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {


    EntityTurret = ig.Box2DEntity.extend({
        size: { x: 32, y: 32 },
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        zIndex: 25,
        name: "turret",
        //customBox2d
        //bodyType: 'static',
        active: true,
        gravityFactor: 0,
        density: 50,
        //isSensor: true,
        //Settings
        owner: null,
        range: 500,
        bulletID: 2,
        projectileCount: 1,
        rof: .3,//was .3
        rofTimer: null,
        rotationRate: 10,
        sound: null,
        lastTarget: null,
        targetAngle: 0,
        currentBodyAngle: 0,
        aimming: false,
        team: 0,
        hp: 5,
        lifespan: 15,
        lifespantimer: null,
        isNetClone: false,
        setOwnerByRid: null,
        animations: {idle: [0], firing: [0,1,2]},
        font: new ig.Font('media/04b03.font.png'),

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.animSheet = new ig.AnimationSheet('media/turrets.png', 32, 32);
            this.addAnim('idle', .2, this.animations.idle);
            this.addAnim('firing', .2, this.animations.firing);

            if (!ig.global.wm) {
                this.sound = soundManager.createSound({ id: 'effect_turretmg', url: './media/sounds/machinegun1.wav', volume: 30 });
                this.body.userData = "turret";
                this.rofTimer = new ig.Timer(this.rof);
                this.lifespantimer = new ig.Timer(this.lifespan);
                this.body.SetLinearDamping(500);//3
            
                //console.log("Netclone Status:", this.isNetClone, settings.setOwnerByRid)
                if (this.isNetClone) {
                    this.owner = ig.game.getNetPlayerByRemoteId(settings.setOwnerByRid)
                    //console.log("New net owner:", this.owner);
                }else{
                    if (this.owner == undefined) {
                        this.owner = ig.game.player;
                        this.setOwnerByRid = ig.game.player.remoteId;
                    }
                }
                this.body.SetAngle(this.owner.body.GetAngle());
            }
        },
        update: function () {
            this.parent()
            
            if (this.lifespantimer.delta() >= 0) {
                
                if (ig.game.player.hasDefenseDrone == true) {
                    ig.game.player.defenseDroneEnt = null;
                }
                this.kill();
            }//Expire it
            //if it is a local turret, allow it to function
            this.gettargets();
            //If it is a net turret, then just update the aim angles and dont shoot!
        },
        gettargets: function(){
            var netplayers = ig.game.getEntitiesByType(EntityNetplayer);
            var allNetPlayers = new Array();
            for (var ap = 0; ap < netplayers.length; ap++) {
                allNetPlayers.push(netplayers[ap]);
            }
            allNetPlayers.push(ig.game.player);
            //Clear out the old target
            this.lastTarget = null;
            //Get the first player on the enemy team
            for (var n = 0; n < allNetPlayers.length; n++) {
                if (allNetPlayers[n].team != this.team) {
                    this.lastTarget = allNetPlayers[n];
                    break;
                }
            }
            //If the target is NOT null, there are enemies in game. So, find the closest.
            if (this.lastTarget != null) {
                //Find closest
                for (var n = 0; n < allNetPlayers.length; n++) {
                    if (allNetPlayers[n].team != this.team) {
                        if (this.distanceTo(this.lastTarget) > this.distanceTo(allNetPlayers[n])) {
                            //if (this.lastTarget.name != allNetPlayers[n]) { console.log("New Target by turret!:", allNetPlayers[n].name, allNetPlayers[n].team, this.team) };
                            this.lastTarget = allNetPlayers[n];
                        }
                    }
                }
                if (this.distanceTo(this.lastTarget) > this.range) {
                    this.lastTarget = null;//No targets close enough
                    this.aimming = false;
                } else {                    
                    //Is the target still close enough to shoot at?
                    //If it is within weapon range, go ahead and shoot. Otherwise, clear out the target to null and look for a new one.
                    this.aim(this.lastTarget);
                }

                             
            } else {
                this.aimming = false;
                this.currentAnim = this.anims.idle;
                this.body.SetAngle(0);
            }
        },
        draw: function(){
            this.parent()
            //this.font.draw("team:" + this.team + " " + this.aimming + " " + this.currentBodyAngle + " " + this.targetAngle, this.pos.x - ig.game.screen.x, this.pos.y - ig.game.screen.y - 20);
            //if (this.lastTarget != null) {
            //    this.font.draw(this.distanceTo(this.lastTarget), this.pos.x - ig.game.screen.x, this.pos.y - ig.game.screen.y - 14);
            //} else {
            //    this.font.draw("Null target", this.pos.x - ig.game.screen.x, this.pos.y - ig.game.screen.y - 14);
            //}
        },
        hurt: function(damage){
            this.hp = this.hp - damage;
            if (this.hp <= 0) {
                if (ig.game.player.hasDefenseDrone == true) {
                    ig.game.player.defenseDroneEnt = null;
                }
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
                this.kill();
            }
        },
        aim: function (target) {
            this.aimming = true;
            var rangle = this.angleTo(target);
            var targetAngle = Math.round(rangle * 180 / Math.PI);
            var currentBodyAngle = Math.round(this.body.GetAngle() * 180 / Math.PI);
            this.targetAngle = targetAngle;

            var rotations = Math.round(currentBodyAngle / 360);
            if (rotations < 0) { rotations = rotations * -1 };
            if (rotations == 0) { rotations = 1 };

            if (currentBodyAngle < -180) {
               currentBodyAngle = (360 * rotations) + currentBodyAngle;
               this.body.SetAngle(currentBodyAngle * (Math.PI / 180));
            };
            if (currentBodyAngle > 180) {
               currentBodyAngle = (-360 * rotations) + currentBodyAngle;
               this.body.SetAngle(currentBodyAngle * (Math.PI / 180));
            };
            
            this.currentBodyAngle = currentBodyAngle;

            if (currentBodyAngle > targetAngle + 10 || currentBodyAngle < targetAngle - 10) {//Give 3 deg range
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
               //Rotating, so set it back to idle
               this.currentAnim = this.anims.idle;
            } else {
               //Stop moving since we have target in sights
               this.body.SetAngularVelocity(0);

               //FIRE as fast as we can
                if (this.rofTimer.delta() >= 0) {
                    this.rofTimer.set(this.rof);
                    if (this.isNetClone == false) {
                        this.shoot(target);
                    }
                }

            }
        },
        shoot: function (target) {
            if (this.sound != null) {
                this.sound.play();
            }
            this.currentAnim = this.anims.firing;

            var x = Math.round(Math.cos(this.body.GetAngle()) * 32 + this.body.GetPosition().x * Box2D.SCALE * 100);
            var y = Math.round(Math.sin(this.body.GetAngle()) * 32 + this.body.GetPosition().y * Box2D.SCALE * 100);
            //console.log("turret-shoot:spawnpos:",x, y);
            var accuracy = ig.game.db.projectileDbArray[this.bulletID].accuracy;
            for (var p = 0; p < this.projectileCount; p++) {

                var bulletSettings = ig.game.db.projectileDbArray[this.bulletID];
                //bulletSettings.accuracy = accReduct;
                //if (bulletSettings.accuracy < 0) { bulletSettings.accuracy = 0; };

                var bullet = ig.game.spawnEntity(EntityProjectile, x, y, bulletSettings);
                var fireAngle = this.body.GetAngle();
                if (accuracy != 0) {

                    fireAngle = fireAngle + ((Math.floor(Math.random() * (accuracy - (-accuracy)) + (-accuracy))) * (Math.PI / 180));
                }


                var fireResult = bullet.fire(fireAngle, this.owner.remoteId, this.owner.team);//fire projectile

                //Multiplayer Transmit
                //ig.game.gamesocket.send('spawnBulletEnt', {
                //    ent: "EntityProjectile",
                //    x: x,
                //    y: y,
                //    settings: bulletSettings,
                //    angle: fireAngle,
                //    remoteId: this.owner.remoteId,
                //    team: this.owner.team
                //});
                ig.game.gamesocket.sendprojectile({
                    ent: "EntityProjectile",
                    x: x,
                    y: y,
                    settings: bulletSettings,
                    angle: fireAngle,
                    remoteId: this.owner.remoteId,
                    team: this.owner.team
                });
            }
        }
    });

});