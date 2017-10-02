ig.module(
	'game.entities.destructable'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function(){

    EntityDestructable = ig.Box2DEntity.extend({
	size: {x: 16, y: 16},	
	type: ig.Entity.TYPE.B,
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.NEVER,	
	animSheet: new ig.AnimationSheet( 'media/crates_16.png', 16, 16 ),
        //Creates random powerup on death
        //Repair armor, repair hull, speed boost, capture boost, optic boost
	animations: { idle: [16], damagelow: [17], damagemed: [18], damagehigh: [19] },
	_wmScalable: false,
	_wmDrawBox: true,
	_wmBoxColor: 'rgba(196, 196, 255, 0.8)',
	zIndex: 30,
    //Box2D Props
	density: 5.0,
	createParticle: false,
	hp: 1,
    maxhp: 1,
    damping: 2,
    //destructable props
	creationId: -1,



	init: function (x, y, settings) {
	    if (settings.creationId != null && settings.creationId != -1 && settings != undefined && !ig.global.wm) {
	        ig.merge(settings, ig.game.db.destructablesDbArray[settings.creationId]);
	    }

	    this.parent(x, y, settings);

	    this.addAnim('idle', 1, this.animations.idle);
	    this.addAnim('damageLow', 1, this.animations.damagelow);
	    this.addAnim('damageMed', 1, this.animations.damagemed);
	    this.addAnim('damageHigh', 1, this.animations.damagehigh);
	    if (!ig.global.wm) {
	        this.body.SetLinearDamping(2.0);
	        this.body.userData = "destructable";
	        var newFilterData = new Box2D.Dynamics.b2FilterData;
	        newFilterData.groupIndex = -8;
	        this.body.GetFixtureList().SetFilterData(newFilterData);
	        this.body.SetAngularDamping(this.damping);
	        this.body.SetLinearDamping(this.damping);
	    }
	},
	update: function(){
	    this.parent();
	    if (this.createParticle) {
	        if (this.hp > 0) {
	            if (this.hp / this.maxhp < .30) {
	                this.currentAnim = this.anims.damageHigh;
	            } else if (this.hp / this.maxhp >= .30 && this.hp / this.maxhp < .60) {
	                this.currentAnim = this.anims.damageMed;
	            } else if (this.hp / this.maxhp >= .6 && this.hp / this.maxhp < .90) {
	                this.currentAnim = this.anims.damageLow;
	            }
	        } else {
	            //Random powerup
	            var spawnItem = Math.floor(Math.random() * (100 - (0)) + (0));
	            var itemType = Math.floor(Math.random() * (3 - (0)) + (0));
	            
	            var itemTypeName = 'regen';
	            var tileset = [];
	            if (itemType == 0) {
	                itemTypeName = 'regen';
	                tileset = [0, 1, 2, 3, 4, 5, 6, 7];
	            } else if (itemType == 1) {
	                itemTypeName = 'movement';
	                tileset = [8, 9, 10, 11, 12, 13, 14, 15];
	            } else if (itemType == 2) {
	                itemTypeName = 'armor';
	                tileset = [16,17,18,19,20,21,22,23];                   
                    
	            }
	            if (spawnItem > 1) {
	                ig.game.spawnEntity(EntityPowerup, this.pos.x, this.pos.y, {
	                    effectType: itemTypeName,
	                    effectTime: 30,
	                    lifespan: 10,
	                    tileset: tileset,
	                });
	            }
	            this.kill();
	        }
	        this.createParticle = false;
	        for (var p = 0; p < ig.global.particleCount.applied; p++) {
	            var randomImpulseX = Math.floor(Math.random() * (100 - (0)) + (0));
	            var randomImpulseY = Math.floor(Math.random() * (100 - (0)) + (0));
	            var particle = ig.game.spawnEntity(EntityParticle, this.pos.x, this.pos.y, { tileset: [4, 5, 6] });
	            particle.body.ApplyImpulse(new Box2D.Common.Math.b2Vec2(randomImpulseX, randomImpulseY), particle.body.GetPosition());
	            particle.body.SetAngularDamping(2);
	            particle.body.SetLinearDamping(2);
	        }
	    }
	},
	debris: function (damage) {
	    //create damage particles
	    //console.log("destructable hurt");
	    if (this.createParticle == false) {
	        this.createParticle = true;
	        if (this.hp > 0) {
	            this.hp = this.hp - damage.hp;
	            //console.log("debris", this.hp, this.maxhp);
	        }
	    }
	},

});


});