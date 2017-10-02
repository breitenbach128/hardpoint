ig.module(
	'game.entities.waypoint'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityWaypoint = ig.Box2DEntity.extend({
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        size: { x: 32, y: 32 },
        //customBox2d
        bodyType: 'static',
        isSensor: true,
        categoryBits: 0x0040,      // collsion type waypoint
        maskBits: 0x0002, //Only collides with local player
        userData: 'waypoint',
        //offset: {x: -7, y:-7},
        zIndex: 1000,
        entityType: 'waypoint',
        animSheet: new ig.AnimationSheet('media/moveTo.png', 32, 32),
        fadeOut: false,
        fadeTime: 1,
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', .2, [0,1,2]);
            if (!ig.global.wm) {
                this.body.userData = this.userData;
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData)
            }
            this.fadeTimer = new ig.Timer();
            this.fadeTimer.pause();

        },
        update: function () {
            this.parent();
            //this.currentAnim.alpha
            if (this.fadeOut) {
                
                if (this.fadeTimer.delta() >= 0) {
                    this.currentAnim.alpha = 0;
                    this.fadeTimer.pause();
                } else {
                    this.currentAnim.alpha = (this.fadeTimer.delta() * -1) / this.fadeTime;
                }
            }
        },
        setNewPosition: function (x, y) {
            if (this.fadeOut) {
                this.fadeTimer.set(this.fadeTime);
            }
            //Move body
            this.body.SetPosition(new Box2D.Common.Math.b2Vec2((x) * Box2D.SCALE, (y) * Box2D.SCALE));
        }


    });
});