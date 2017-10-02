ig.module(
	'game.entities.hardpoint'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityHardpoint = ig.Entity.extend({
        size: { x: 1, y: 1 },
        zIndex: 800,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!

        animSheet: new ig.AnimationSheet('media/Chassis_1.png', 128, 64),
        tileSeries: [0],


        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, this.tileSeries);
        },

        update: function () {
            this.parent();
        },
    });

});