ig.module(
	'game.entities.netarmor'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityNetarmor = ig.Box2DEntity.extend({
        size: { x: 128, y: 8 },
        zIndex: 200,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        density: 2,
        active: true,
        name: "armor",
        bodyType: 'dynamic',
        animSheet: new ig.AnimationSheet('media/Chassis_armor1.png', 128, 8),
        font: new ig.Font('media/04b03.font.png'),
        tileSeries: [0],
        generateImpactParticle: { state: false, type: 'bullet', position: { x: 0, y: 0 } },
        hp: 100,
        maxhp: 100,
        mp: 100,
        armorPosition: "none",
        owner: null,
        hardpointsBound: new Array(),
        categoryBits: ig.global.COL_NETPLAYER_ARMOR,      // collsion type localBullet, 0x0010 for netbullet
        maskBits: ~ig.global.COL_BULLET_LOCAL && ~ig.global.COL_BULLET_NET && ~ig.global.COL_NETPLAYER,        // DOES NOT COLLIDE WITH 0x0008(localbullet) or netbullet and DOES collide with Player, NetArmor
        //maskBits: ~0x0008,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.addAnim('full', 1, [0]);
            this.addAnim('lightDamage', 1, [1]);
            this.addAnim('medDamage', 1, [2]);
            this.addAnim('highDamage', 1, [3]);
            this.addAnim('fullDamage', 1, [4]);
            this.currentAnim = this.anims.full;
            if (!ig.global.wm) {
                this.body.gravityScale = 0;
                //this.body.SetFixedRotation(true);
                var newFilterData = new Box2D.Dynamics.b2FilterData;
                //newFilterData.groupIndex = -8;//-9 For weapon and tank chassis and armor
                newFilterData.categoryBits = this.categoryBits;
                newFilterData.maskBits = this.maskBits;
                this.body.GetFixtureList().SetFilterData(newFilterData);

                this.body.userData = "netarmor";
            }
            //Set hp values
            this.maxhp = this.hp;
        },

        update: function () {
            if (ig.game.startGame == true) {
                if (this.active) {
                    this.parent();
                }

            }

        },
        draw: function () {

            if (this.active) {
                this.parent();
            }
        },

 
    });

});