ig.module(
	'game.entities.crate'
)
.requires(
	'plugins.box2d.entity'
)
.defines(function(){

    EntityCrate = ig.Entity.extend({
	size: {x: 16, y: 16},	
	type: ig.Entity.TYPE.B,
	checkAgainst: ig.Entity.TYPE.NONE,
	collides: ig.Entity.COLLIDES.NEVER,	
	animSheet: new ig.AnimationSheet('media/crates_16.png', 16, 16),
	
	init: function (x, y, settings) {
	    this.parent(x, y, settings);
		this.addAnim( 'idle', 1, [0] );
		
	}
});


});