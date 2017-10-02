ig.module(
	'game.entities.beacon'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityBeacon = ig.Entity.extend({
        size: { x: 32, y: 32 },
        zIndex: 800,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER,
        animSheet: new ig.AnimationSheet('media/beaconAlert.png', 32, 32),
        tileSeries: [0,1,2],
        lifespan: 0,
        lifeTimer: null,
        endloopanim: false,
        setAlpha: 1,
        team: 0,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', 1, this.tileSeries, this.endloopanim);
            if (this.lifespan != 0) {
                this.lifeTimer = new ig.Timer();
                this.lifeTimer.set(this.lifespan);
            }
            this.currentAnim.alpha = this.setAlpha;
        },

        update: function () {
            this.parent();
            if (this.lifespan != 0) {
                if (this.lifeTimer.delta() >= 0) { this.kill(); };
            }
        },
    });

});