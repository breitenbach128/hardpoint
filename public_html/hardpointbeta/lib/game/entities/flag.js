ig.module(
	'game.entities.flag'
)
.requires(
	'plugins.box2d.entity'
)
.defines(function () {

    EntityFlag = ig.Entity.extend({
        size: { x: 24, y: 24 },

        type: ig.Entity.TYPE.B,
        checkAgainst: ig.Entity.TYPE.A,
        collides: ig.Entity.COLLIDES.NEVER,
        gravityFactor: 1,
        //Custom
        carriedByTeam: 0,//Which team picked it up last.
        spawnPos: {x:0,y:0},
        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.animSheet = new ig.AnimationSheet('media/objectivesLocations.png', 24, 24);
            this.addAnim('flagidle', .2, [12, 12, 12]);
            this.addAnim('flag1', .2, [12, 12, 12]);
            this.addAnim('flag2', .2, [12, 12, 12]);
            ig.game.flag = this;
            this.spawnPos.x=x;
            this.spawnPos.y=y;
        },
        update: function(){
            this.parent();

        },
        check: function (other) {
            if (other.entityType == 'player') {
                this.take(other);
            }

        },
        take: function (p) {
            p.flagheld = true;
            this.gravityFactor = 0;
            this.pos.x = -1000;
            this.pos.y = -1000;
            console.log(this.pos.x + ":" +this.pos.y);
        },
        drop: function (p) {
            p.flagheld = false;
            this.gravityFactor = 1;
            this.pos.x = p.pos.x;
            this.pos.y = p.pos.y;
        },
        reset: function (p) {
            p.flagheld = false;
            this.gravityFactor = 1;
            this.pos.x = this.spawnPos.x;
            this.pos.y = this.spawnPos.y;
        }
    });


});