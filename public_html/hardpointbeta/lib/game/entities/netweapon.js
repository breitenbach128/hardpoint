ig.module(
	'game.entities.netweapon'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    //Other play entity that handles local display of connected players.

    //The Node server tracks all other other players and updates their positions via  game array. It also
    //updates their animations and all projectiles on the screen. This really just handles display. All the hitcode is going to be client side in this case,
    //as it is a fairly simple game. Projectiles are created and those are the things that do damage, so those are the only really serious tracking for which projectile is from which team.
    EntityNetweapon = ig.Box2DEntity.extend({
        size: { x: 32, y: 24 },
        offset: { x: 0, y: 0 },
        zIndex: 300,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        active: true,
        health: 9999,
        friction: 1,
        restitution: 0,
        gravityFactor: 0,
        name: "netweapon",
        //custom variables
        animSheet: new ig.AnimationSheet('media/weapons.png', 32, 24),
        font: new ig.Font('media/04b03.font.png'),
        wpTileSetIdle: [0],
        team:0,
        //Box2d Collision Filters
        categoryBits: ig.global.COL_NETPLAYER_WEAPON,      // collsion type localBullet, 0x0010 for netbullet
        //maskBits: ~0x0002 && 0xFFFF,        // does not collide with LocalPlayer and collides with everything else
        maskBits: ig.global.COL_NONE,

        init: function (x, y, settings) {
            this.parent(x, y, settings);

            if (!ig.global.wm) {
                //this.body.SetFixedRotation(true);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                //newFilterData.groupIndex = 0;//Collide with nothing, just be a display
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);
                this.body.SetAngularDamping(.5);
                //Dampening (linear and angular)
                this.body.SetLinearDamping(3);//3
                
            }

            this.addAnim('idle', 1, this.wpTileSetIdle);
            this.currentAnim = this.anims.idle;
        },

        update: function () {
            if (this.active) {
                this.parent();
            }


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

    });

});