ig.module(
	'game.entities.eyecandy'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityEyecandy = ig.Entity.extend({
        size: { x: 1, y: 1 },
        zIndex: 800,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER,         
        animSheet: new ig.AnimationSheet('media/Chassis_1.png', 128, 64),
        tileSeries: [0],
        lifespan: 0,
        lifeTimer: null,
        endloopanim: false,
        setAlpha: 1,
        frameTime: 1,
        attachedTo: null,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', this.frameTime, this.tileSeries, this.endloopanim);
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
            if (this.attachedTo != null) {
                this.pos = this.attachedTo.pos;
                this.currentAnim.angle = this.attachedTo.currentAnim.angle;
            }
        },

        attachTo: function (ent) {
            this.attachedTo = ent;
        }
    });

});