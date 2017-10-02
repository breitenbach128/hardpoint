ig.module( 
	'plugins.box2d.entity'
)
.requires(
	'impact.entity',	
	'plugins.box2d.game'
)
.defines(function(){


ig.Box2DEntity = ig.Entity.extend({
	body: null,
	angle: 0,
	isDead: false,
	density: 1.0,
	friction: .5,
	restitution: .3,
	bodyType: 'dynamic',
    isSensor: false,
	lastCenter: {x:0 ,y: 0},

	init: function( x, y , settings ) {
		this.parent( x, y, settings );
		
		// Only create a box2d body when we are not in Weltmeister
		if( !ig.global.wm ) { 
			this.createBody();
		}
	},
	
	createBody: function() {
		var bodyDef = new Box2D.Dynamics.b2BodyDef();
		bodyDef.position = new Box2D.Common.Math.b2Vec2(
			(this.pos.x + this.size.x / 2) * Box2D.SCALE,
			(this.pos.y + this.size.y / 2) * Box2D.SCALE
		);
		//if (this.name == 'particle') { console.log("BODYDEF: " + bodyDef); };
	    //bodyDef.position.Set( 12.3, 45.6 ); //body will start here
		//if (ig.global.class == -1) {
		//    //this.body.SetGravityScale(0);
		//    bodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;
		//} else {
		//    //this.body.SetGravityScale(0);
		//    bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
	    //}
		if (this.bodyType == "dynamic") {
		    bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
		} else if (this.bodyType == "static") {
		    bodyDef.type = Box2D.Dynamics.b2Body.b2_staticBody;
		} else {
		    bodyDef.type = Box2D.Dynamics.b2Body.b2_dynamicBody;
		}
		//if (this.name == 'particle') { console.log("BODYTYPE: " + bodyDef.type); };
		this.body = ig.world.CreateBody(bodyDef);
		//if (this.name == 'particle') { console.log("BODYCREATE: " + this.body); };

		var fixture = new Box2D.Dynamics.b2FixtureDef;
		fixture.shape = new Box2D.Collision.Shapes.b2PolygonShape();
		fixture.shape.SetAsBox(
			this.size.x / 2 * Box2D.SCALE,
			this.size.y / 2 * Box2D.SCALE
		);
		//if (this instanceof EntityNetplayer) {
		//    console.log("density is :" + this.density);
		//}
		fixture.isSensor = this.isSensor;
		fixture.density = this.density;
		fixture.friction = this.friction;
		fixture.restitution =this.restitution;
		
		this.body.CreateFixture(fixture);
		this.body.entity = this;

		this.lastbox2dtile = {
			x1:0,
			y1:0,
			x2:0,
			y2:0,
			c:{x:0,y:0}
		}
	},
	
	update: function () {
	    if (this.isDead) {
	        this.dead();
	    } else {
	        var p = this.body.GetPosition();

	        this.pos = {
	            x: (p.x / Box2D.SCALE - this.size.x / 2),
	            y: (p.y / Box2D.SCALE - this.size.y / 2)
	        };

	        this.angle = this.body.GetAngle().round(2);

	        if (this.currentAnim) {
	            this.currentAnim.update();
	            this.currentAnim.angle = this.angle;
	        }
	    }
	},
	rotateTo: function (degree) {	    
	    //this.body.SetXForm(this.body.GetPosition(), RadAngle);
	    var RadAngle = degree * (Math.PI / 180);
	    //this.body.SetTransform(this.body.GetPosition(), RadAngle);
	    this.body.SetAngle(degree);
	},
	kill: function() {
	    this.isDead = true;
	},
    dead: function(){
        ig.world.DestroyBody(this.body);
        //this.parent();
        ig.game.removeEntity(this);
    },

});
	
});
//k.prototype.SetPositionAndAngle = function (a, c) {
//    if (c === undefined) c = 0; var g; if (this.m_world.IsLocked() != true) {
//        this.m_xf.R.Set(c);
//        this.m_xf.position.SetV(a);
//        g = this.m_xf.R;
//        var b = this.m_sweep.localCenter;
//        this.m_sweep.c.x = g.col1.x * b.x + g.col2.x * b.y;
//        this.m_sweep.c.y = g.col1.y * b.x + g.col2.y * b.y;
//        this.m_sweep.c.x += this.m_xf.position.x;
//        this.m_sweep.c.y += this.m_xf.position.y;
//        this.m_sweep.c0.SetV(this.m_sweep.c);
//        this.m_sweep.a0 = this.m_sweep.a = c;
//        b = this.m_world.m_contactManager.m_broadPhase;
//        for (g = this.m_fixtureList; g; g = g.m_next) g.Synchronize(b, this.m_xf, this.m_xf);
//        this.m_world.m_contactManager.FindNewContacts()
//    }
//};