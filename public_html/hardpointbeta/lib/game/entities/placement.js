ig.module(
	'game.entities.placement'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {


    EntityPlacement = ig.Box2DEntity.extend({
        size: { x: 128, y: 128 },
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        gravityFactor: 0,
        zIndex: 25,
        name: "placementmarker",
        colorbg: ("rgba(" + 10 + "," + 190 + "," + 10 + "," + (100 / 255) + ")"),
        //customBox2d
        //bodyType: 'static',
        isSensor: true,
        colliding: false,
        attachedTo: null,
        placementType: 'none',
        rangelimit: 9999,
        owner: null,
        sourceAbility: null,
        spawnEnt: { ready: false, enttype: null, entsettings: null, pos: { x: 0, y: 0 } },
        killswitch: false,
        visualEffects:{onCreate: -1, onDeath: -1},
        //categoryBits: 0x0200,      // collsion type localBullet, 0x0010 for netbullet
        //maskBits: 0xFFFF,        // collides with everything else

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            //this.animSheet = new ig.AnimationSheet('media/zone_captureArea_1.png', 128, 128);
            //this.addAnim('idle', .2, [0]);

            if (!ig.global.wm) {
                this.body.userData = "placementmarker";
                //var newFilterData = new Box2D.Dynamics.b2FilterData;
                ////newFilterData.groupIndex = this.collisionGroup;
                //newFilterData.categoryBits = this.categoryBits;
                //newFilterData.maskBits = this.maskBits;
                //this.body.GetFixtureList().SetFilterData(newFilterData);
            }
            if (this.attachedTo != null) {
                this.attachedTo = ig.game.getEntityByName(this.attachedTo);

            }
            if (this.owner == undefined) {
                this.owner = ig.game.player;
            }
            //console.log("Created placement marker");
            if (this.visualEffects.onCreate != -1) {
                var settings = ig.game.db.eyeCandyDBArray[this.visualEffects.onCreate];
                ig.game.spawnEntity(EntityEyecandy, this.pos.x + (this.size.x / 2), this.pos.y + (this.size.y / 2), settings);//
            }
        },
        update: function () {
            this.parent()
            if (this.attachedTo != null) {
                if (this.attachedTo.body != null & this.attachedTo.body != undefined) {
                    this.body.SetPosition(this.attachedTo.body.GetPosition());
                } else {
                    this.body.SetPosition(new Box2D.Common.Math.b2Vec2((this.attachedTo.pos.x + (this.attachedTo.size.x / 2)) * Box2D.SCALE, (this.attachedTo.pos.y + (this.attachedTo.size.y / 2)) * Box2D.SCALE));
                }
            }
            if (this.distanceTo(this.owner) >= this.rangelimit) {
                this.colorbg = ("rgba(" + 190 + "," + 10 + "," + 190 + "," + (100 / 255) + ")");
            } else if (this.colliding == true){
                this.colorbg = ("rgba(" + 190 + "," + 10 + "," + 10 + "," + (100 / 255) + ")");
            } else {
                this.colorbg = ("rgba(" + 10 + "," + 190 + "," + 10 + "," + (100 / 255) + ")");
            }
            if (this.spawnEnt.ready) {
                this.spawnEntOnCycle();
                this.spawnEnt.ready = false;
            }
        },
        draw: function () {
            this.parent();
            //Draw colored placement grid
            ig.system.context.fillStyle = this.colorbg;
            ig.system.context.fillRect((this.pos.x - ig.game.screen.x) * ig.system.scale,
                (this.pos.y - ig.game.screen.y) * ig.system.scale,
                this.size.x * ig.system.scale,
                this.size.y * ig.system.scale);
            ig.system.context.fillText("Select Location", (this.pos.x - ig.game.screen.x) * ig.system.scale, (this.pos.y - ig.game.screen.y - 32) * ig.system.scale);
        },
        spawnEntOnCycle: function(){
            var newEnt = ig.game.spawnEntity(this.spawnEnt.enttype, this.spawnEnt.pos.x, this.spawnEnt.pos.y, this.spawnEnt.entsettings);
            newEnt.body.SetPosition(this.body.GetPosition());
            this.death();
        },
        startCooldowns: function(){
            this.sourceAbility.cdtimer.set(this.sourceAbility.cooldown);
            this.sourceAbility.effTimer.set(this.sourceAbility.occurence.effecttime);
            this.sourceAbility.active = true;
        },
        action: function () {
            //console.log("Trigger placement action", this.colliding, this.placementType);
            if (this.colliding == false && this.distanceTo(this.owner) < this.rangelimit) {
                //'kill','AbilityCreateEnt', 'AbilityBodyMod' with If statement based on actionType in settings passed by ability during creation.

                //If it has an onCreate Visual Effect, run it here.
                if (this.visualEffects.onCreate != -1) {
                    var settings = ig.game.db.eyeCandyDBArray[this.visualEffects.onCreate];
                    ig.game.spawnEntity(EntityEyecandy, this.body.GetPosition().x / Box2D.SCALE - (this.size.x / 2), this.body.GetPosition().y / Box2D.SCALE - (this.size.y / 2), settings);//
                    ig.game.gamesocket.send('spawnEyeCandyFromDB', {
                        ent: 'EntityEyecandy',
                        index: this.visualEffects.onDeath,
                        x: this.body.GetPosition().x / Box2D.SCALE - (this.size.x / 2),
                        y: this.body.GetPosition().y / Box2D.SCALE - (this.size.y / 2)
                    });
                }
                //Create placement ents
                if (this.placementType == 'AbilityCreateEnt-Turret') {
                    //console.log(this.placementType, ig.game.player.abilitySlot1.entityCreate.type, this.body.GetPosition().x / Box2D.SCALE, this.body.GetPosition().y / Box2D.SCALE, JSON.stringify(ig.game.player.abilitySlot1.entityCreate.settings))
                    //Ready settings
                    this.spawnEnt.ready = true;
                    this.spawnEnt.enttype = ig.game.player.abilitySlot1.entityCreate.type;
                    this.spawnEnt.entsettings = ig.game.player.abilitySlot1.entityCreate.settings;
                    this.spawnEnt.entsettings.team = ig.game.player.team;
                    this.spawnEnt.pos = { x: this.body.GetPosition().x / Box2D.SCALE, y: this.body.GetPosition().y / Box2D.SCALE };
                    
                    //Spawn a copy via a network broadcast
                    ig.game.gamesocket.send('spawnTurret', {
                        box2dpos: this.body.GetPosition(),
                        settings: this.spawnEnt.entsettings,
                        remoteId: ig.game.player.remoteId,
                        team: ig.game.player.team
                    });

                } else if (this.placementType == 'AbilityBodyMod-Teleport') {
                    //Set position
                    ig.game.player.abilitySlot1.setPhysics(this.body.GetPosition());

                    //Destroy
                    this.death();
                }                
                ig.game.mousePointerBox2d.mode = 'selection';
                //Start ability cooldowns
                this.startCooldowns();
            }

        },
        cancel: function(){
            this.sourceAbility.resetAbility();
            this.kill();
        },
        startCollision: function () {
            this.colliding = true;
            
        },
        endCollision: function () {
            this.colliding = false;
            
        },
        death: function(){
            if (this.visualEffects.onDeath != -1) {
                var settings = ig.game.db.eyeCandyDBArray[this.visualEffects.onDeath];
                ig.game.spawnEntity(EntityEyecandy, this.body.GetPosition().x / Box2D.SCALE - (this.size.x / 2), this.body.GetPosition().y / Box2D.SCALE - (this.size.y / 2), settings);//
                ig.game.gamesocket.send('spawnEyeCandyFromDB', {
                    ent: 'EntityEyecandy',
                    index: this.visualEffects.onDeath,
                    x: this.body.GetPosition().x / Box2D.SCALE - (this.size.x / 2),
                    y: this.body.GetPosition().y / Box2D.SCALE - (this.size.y / 2)
                });
            }
            this.kill();
        }
    });

});