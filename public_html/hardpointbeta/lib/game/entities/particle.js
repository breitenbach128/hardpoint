ig.module(
	'game.entities.particle'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityParticle = ig.Box2DEntity.extend({
        size: { x: 4, y: 4 },
        zIndex: 200,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        name: 'particle',
        animSheet: new ig.AnimationSheet('media/particles.png', 4, 4),
        //custom Properties
        particletype: 0,//What type of particle is it? Used for pooling.
        tileset: [0],
        lifespan: 1,
        lifeTimer: null,
        


        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, this.tileset);
            if (!ig.global.wm) {
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.groupIndex = 0;
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