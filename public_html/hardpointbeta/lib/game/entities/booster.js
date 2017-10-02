ig.module(
	'game.entities.booster'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    //Grant boosts like repair armor, repair hull.
    EntityBooster = ig.Box2DEntity.extend({
        size: { x: 4, y: 4 },
        zIndex: 200,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        name: 'particle',
        animSheet: new ig.AnimationSheet('media/particles.png', 4, 4),
        //custom Properties
        tileset: [0],
        lifespan: 1,
        lifeTimer: null,



        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, this.tileset);
            if (!ig.global.wm) {
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.groupIndex = -8;
                this.body.GetFixtureList().SetFilterData(newFilterData);
            }
            this.lifeTimer = new ig.Timer();
            this.lifeTimer.set(this.lifespan);
        },

        update: function () {
            this.parent();
            if (this.lifeTimer.delta() >= 0) { this.kill(); };
        },
    });

});