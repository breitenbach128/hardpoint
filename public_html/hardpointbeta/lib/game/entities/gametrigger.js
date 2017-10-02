ig.module('game.entities.gametrigger')
.requires(
  'impact.entity',  
  'plugins.box2d.entity'
)
.defines(function () {

    EntityGametrigger = ig.global.EntityGametrigger = ig.Box2DEntity.extend({
        size: { x: 16, y: 16 },
        collides: ig.Entity.COLLIDES.NEVER,
        gravityFactor: 0,
        health: 100,
        type: ig.Entity.TYPE.B,
        checkAgainst: ig.Entity.TYPE.BOTH,//Was type A
        _wmScalable: true,
        _wmDrawBox: true,
        _wmBoxColor: '#00FF00',
        //customBox2d
        bodyType: 'static',
        isSensor: true,
        //Custom Properties
        entityType: 'trigger',
        firedTrig: false,
        explored: false,
        reset: false,
        resetTimer: null,
        resetTime: 2,
        repeat: false,//Allow more than one trigger
        category: "zone",
        desc: "",
        checkType: 'player', //What does it check against?
        _target: 'none',


        init: function (x, y, settings) {
            this.parent(x, y, settings);
            if (!ig.global.wm) {
                this.body.userData = "trigger";
                this.resetTimer = new ig.Timer();
                this.resetTimer.pause();
            }
        },
        update: function () {
            this.parent();


            if (this.firedTrig && this.repeat) {
                if (this.resetTimer.delta() > 0) {
                    this.firedTrig = false;
                    this.resetTimer.pause();
                } 
            }

        },
        draw: function(){
            this.parent();

        },
        fire: function () {
            this.resetTimer.set(this.resetTime);
        },
    });

});