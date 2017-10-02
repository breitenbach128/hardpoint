﻿ig.module(
	'game.entities.barrel'
)
.requires(
	'plugins.box2d.entity'
)
.defines(function () {
    //Barrels respawn and explode. They take a explode with a 20% on each time they receive damage. So, it is not always a thing.
    EntityBarrel = ig.Entity.extend({
        size: { x: 16, y: 16 },

        type: ig.Entity.TYPE.B,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER,

        animSheet: new ig.AnimationSheet('media/crates_16.png', 16, 16),

        init: function (x, y, settings) {
            this.addAnim('idle', 1, [0]);
            this.parent(x, y, settings);
        }
    });


});