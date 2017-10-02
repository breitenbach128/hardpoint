//A water entity for blocking tank movement, but not projectiles. These are invisible and cover water tiles on the map.
ig.module(
	'game.entities.water'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    EntityWater = ig.Box2DEntity.extend({
        size: { x: 128, y: 128 },
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        gravityFactor: 0,
        zIndex: 25,
        name: "water",
        //customBox2d
        bodyType: 'static',
        categoryBits: 0x0100,      // collsion type water
        maskBits: 0x0002,        // does  collide with localplayer and collides with nothing else
        //WM Editor
        _wmScalable: true,
        _wmDrawBox: true,
        _wmBoxColor: 'rgba(82, 187, 222, 0.3)',
        //Images


        init: function (x, y, settings) {
            this.parent(x, y, settings);
            //this.animSheet = new ig.AnimationSheet('media/zone_captureArea_1.png', 128, 128);
            //this.addAnim('idle', .2, [0, 1, 2, 3, 4, 5, 6]);
            //this.addAnim('team1', .2, [6, 7, 8, 9, 10, 11, 12]);//
            if (!ig.global.wm) {
                this.body.userData = "water";
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);
            }
        },

    });

});