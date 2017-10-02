ig.module(
	'game.entities.ainode'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {
    EntityAinode = ig.Entity.extend({
        size: { x: 128, y: 128 },
        zIndex: 800,
        gravityFactor: 0,
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER,      
        //Animation   
        animSheet: new ig.AnimationSheet('media/Chassis_1.png', 128,128),
        tileSeries: [0],
        frameTime: 1,
        //Node - AI data
        //0 - Normal node, 1 - Ambush Node, 2 - Flank Node, 3 - Defense Node, 4 - Offense Node
        //This way, the AI can favor certain nodes for certain conditions
        nodetype: 0,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            if (!ig.global.wm) {
                this.addAnim('idle', this.frameTime, this.tileSeries, this.endloopanim);
                var ainodes = ig.game.getEntitiesByType(EntityAinode);
                this.nodeid = ainodes.length;
            }
        },

        update: function () {
            this.parent();
        },

    });

});

//AI nodes are just entities which allow the AI to more easily pathfind by providing certain points to go to if they are on patrol, or search mode.
//Search mode targets a random set of AI nodes and makes those it's waypoints
//Patrol mode targets two random nodes and moves back and forth between the two.