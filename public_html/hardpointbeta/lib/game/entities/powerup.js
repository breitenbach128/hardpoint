ig.module(
	'game.entities.powerup'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityPowerup = ig.Box2DEntity.extend({
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        size: { x: 16, y: 16 },
        //customBox2d
        categoryBits: 0x0040,      // collsion type waypoint
        maskBits: 0x0002 && 0x0020, //Only collides with local player
        userData: 'powerup',
        //offset: {x: -7, y:-7},
        zIndex: 1000,
        entityType: 'powerup',
        animSheet: new ig.AnimationSheet('media/powerUps.png', 16, 16),
        fadeOut: false,
        fadeTime: 1,
        //effect
        effectType: 'regen',
        effectTime: 30,
        //Lifespan
        lifespan: 10,
        lifeTimer: null,
        tileset:[],
        killNow: false,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('idle', .2, this.tileset);
            if (!ig.global.wm) {
                this.body.userData = this.userData;
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData)
            }
            this.fadeTimer = new ig.Timer();
            this.fadeTimer.pause();
            if (this.lifespan != 0) {
                this.lifeTimer = new ig.Timer();
                this.lifeTimer.set(this.lifespan);
            }
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

            if (this.lifespan != 0) {
                if (this.lifeTimer.delta() >= 0) { this.kill(); };
            }
            if (this.killNow) {
                this.kill();
            }
        },
        collect: function () {
            if (this.fadeOut) {
                this.fadeTimer.set(this.fadeTime);
            }
            this.killNow = true;
            ig.game.player.addStatusEffect(this.effectType,this.effectTime,5,true);
            //ig.game.player.statusEffects.push({ name: this.effectType, stack: this.effectTime, value: 5 });
        }


    });
});