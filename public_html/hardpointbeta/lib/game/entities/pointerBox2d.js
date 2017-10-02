ig.module(
	'game.entities.pointerBox2d'
)
.requires(
	'impact.entity',
    'plugins.box2d.entity'
)
.defines(function () {

    EntityPointerBox2d = ig.Box2DEntity.extend({
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        name: 'mousePointerBox2d',
        size: { x: 1, y: 1 },
        zIndex: 1000,
        selectedArray: new Array(),
        areaSelection: { selecting: false, sx: 0, sy: 0, ex: 0, ey: 0 },
        aabbZone: {uX: 0 ,lX: 0, uY: 0, lY:0},        
        font: new ig.Font('media/04b03.font.png'),
        mode: 'selection', //Selection, Placement

        init: function(x,y,settings) {
            this.parent(x, y, settings);
            //this.body.userData = "mouseb2";
            this.clickTimer = new ig.Timer();
            this.clickTimer.set(.5);
            this.clickTimer.pause();
        },
        update: function () {
            this.parent();

            var click = this.ClickCoordinates(ig.input.mouse.x, ig.input.mouse.y);
            if (this.mode == 'placement') {
                this.placementMode();
            } else {
                this.selectionMode();
            }

        },
        draw: function(){
            this.parent(); 
        },
        selectionMode: function(){
            if (ig.input.pressed("leftButton")) {
                for (var w = 0; w < ig.game.player.hardpoints.length; w++) {
                    if (ig.game.player.hardpoints[w].weapon.group == 1) {
                        ig.game.player.hardpoints[w].weapon.behavior = 2;
                    }
                }
            } else if (ig.input.pressed("rightButton")) {
                for (var w = 0; w < ig.game.player.hardpoints.length; w++) {
                    if (ig.game.player.hardpoints[w].weapon.group == 2) {
                        ig.game.player.hardpoints[w].weapon.behavior = 2;
                    }
                }
            }
            //Releasing fire buttons
            if (ig.input.released("leftButton")) {
                for (var w = 0; w < ig.game.player.hardpoints.length; w++) {
                    if (ig.game.player.hardpoints[w].weapon.group == 1) {
                        ig.game.player.hardpoints[w].weapon.behavior = 1;
                    } 
                }
            } else if (ig.input.released("rightButton")) {
                for (var w = 0; w < ig.game.player.hardpoints.length; w++) {
                    if (ig.game.player.hardpoints[w].weapon.group == 2) {
                        ig.game.player.hardpoints[w].weapon.behavior = 1;
                    }
                }
            }

        },
        placementMode: function(){
            if (ig.input.pressed("leftButton")) {
                //Call placement action function
                ig.game.player.abilitySlot1.placementEnt.ent.action();                
            }
            if (ig.input.pressed("rightButton")) {
                //Cancel placement
                ig.game.player.abilitySlot1.placementEnt.ent.cancel();
                this.mode = 'selection';
            }
        },

        shortClick: function (x, y) {
            
        },
        longClick: function(x,y){

        },
        addSelectedArray: function(body){
            body.entity.selected = true;
            //console.log(body.entity.name, body.entity.selected);
            this.selectedArray.push(body);
        },
        clearSelectedArray: function () {
            //console.log("selected arr length", this.selectedArray.length);
            for (var s = 0; s < this.selectedArray.length; s++) {
                this.selectedArray[s].entity.selected = false;
                //console.log(this.selectedArray[s].entity.name, s, this.selectedArray[s].entity.selected);
            }
            this.selectedArray.length = 0;
            this.selectedArray = [];
        },
        getBodyInArea: function(){
            // Box2D requires window coordinates
            var upper = this.ClickCoordinates(this.areaSelection.sx - ig.game.screen.x, this.areaSelection.sy - ig.game.screen.y);
            var lower = this.ClickCoordinates(this.areaSelection.ex - ig.game.screen.x, this.areaSelection.ey - ig.game.screen.y);
            this.aabbZone = { uX: upper.x / Box2D.SCALE, lX: lower.x / Box2D.SCALE, uY: upper.y / Box2D.SCALE, lY: lower.y / Box2D.SCALE }
            //console.log("AABBZONE:" + JSON.stringify(this.aabbZone));
            var aabb = new Box2D.Collision.b2AABB();
            //aabb.lowerBound.Set(lower.x, lower.y);
            //aabb.upperBound.Set(upper.x, upper.y);
            aabb.upperBound.Set(lower.x, lower.y);
            aabb.lowerBound.Set(upper.x, upper.y);

            // Query the world for overlapping shapes.
            this.selectedBody = null;
            this.clearSelectedArray();
            ig.world.QueryAABB(this.getBodyCBArea, aabb);
            //console.log("selected Array size: " + this.selectedArray.length);
            return this.selectedBody;
        },
        getBodyAtMouse: function () {
            // Box2D requires window coordinates
            var click = this.ClickCoordinates(ig.input.mouse.x, ig.input.mouse.y);
            this.aabbZone = { uX: click.x + 0.001, lX: click.x - 0.001, uY: click.y + 0.001, lY: click.y - 0.001 }
            var aabb = new Box2D.Collision.b2AABB();
            aabb.lowerBound.Set(click.x - 0.001, click.y - 0.001);
            aabb.upperBound.Set(click.x + 0.001, click.y + 0.001);

            // Query the world for overlapping shapes.
            this.selectedBody = null;
            this.clearSelectedArray();
            ig.world.QueryAABB(this.getBodyCB, aabb);
            //console.log("selected Array size: " + this.selectedArray.length);
            return this.selectedBody;
        },
        getBodyCBArea: function(fixture){
            var body = fixture.GetBody();
            if (body.GetType() != Box2D.Dynamics.b2Body.b2_staticBody) {


                //ig.game.mousePointerBox2d.selectedBody = fixture.GetBody();
                if (body.entity.entType == "weapon") {
                    ig.game.mousePointerBox2d.addSelectedArray(body);
                }

            }
            return true;
        },
        getBodyCB: function (fixture) {
            var click = ig.game.mousePointerBox2d.ClickCoordinates(ig.input.mouse.x, ig.input.mouse.y);
            this.mousePVec = new Box2D.Common.Math.b2Vec2(click.x, click.y);
            
            //console.log("getBodyCB: fixture type = " + fixture.GetBody().GetType());

            if (fixture.GetBody().GetType() != Box2D.Dynamics.b2Body.b2_staticBody) {

                if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(),mousePVec)) {
                    ig.game.mousePointerBox2d.selectedBody = fixture.GetBody();
                    ig.game.mousePointerBox2d.addSelectedArray(fixture.GetBody());
                    return true;//Is false terminateing the query too soon?
                } else {
                    return false;
                }
            }
            return true;
        },

        ClickCoordinates: function (localX, localY) {
            return {
                x: (localX + ig.game.screen.x) * Box2D.SCALE,
                y: (localY + ig.game.screen.y) * Box2D.SCALE
            };
        },


    });

});