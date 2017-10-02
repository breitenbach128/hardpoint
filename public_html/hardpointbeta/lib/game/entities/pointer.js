ig.module(
	'game.entities.pointer'
)
.requires(
	'impact.entity',
    'plugins.box2d.entity'
)
.defines(function () {
    //Make this a box2d Ent, adn make it a static body and a sensor!! Then I can check collisions in the listener. AND ONLY collide with player
    //hmm, but how would I check for entities of button types and such...I'll need to figure that out.
    EntityPointer = ig.Entity.extend({
        checkAgainst: ig.Entity.TYPE.BOTH,
        collides: ig.Entity.COLLIDES.NEVER,
        size: { x: 4, y: 4 },
        zIndex: 1000,
        animSheet: new ig.AnimationSheet('media/mousetarget1.png', 4, 4),
        name: 'mousePointer',
        //box2D custom properties for AABB Check
        mouseJoint: false,
        //custom properties
        isClicking: false,
        selectionArray: new Array(),
        toolTipZone: { x: 0, y: 0, w: 0, h: 0 },
        toolTipActive: false,

        init: function(x,y,settings){
            this.parent(x, y, settings);
            this.addAnim('idle', 1, [0]);
           //console.log("Mouse created");
            this.screenElements = new ig.Image('media/screenelements1.png');
            this.dataimage = this.screenElements.data;
            if (!ig.global.wm) {
                this.tooltiptext = new ig.Canvastext({ text: "This is a  test", fontsize: 8, width: 15, spacing: 8, location: { x: -100, y: -100 }, background: true });
            }
        },
        update: function () {
            // Update all entities and backgroundMaps
            this.parent();
            // Update the position to follow the mouse cursor. You
            // may also have to account for ig.game.screen.x/y here 
            this.pos.x = ig.input.mouse.x + ig.game.screen.x-2;
            this.pos.y = ig.input.mouse.y + ig.game.screen.y-2;
            
            // Only check for the click once per frame, instead of
            // for each entity it touches in the 'check' function
            this.isClicking = ig.input.pressed('leftButton');
            //Sort by zIndex for clicking overlapping objects

            if (this.isClicking && ig.global.started) {

            }
            if (this.selectionArray.length > 0) {

                var tempArry = this.selectionArray.sort(
                    function compare(a, b) {
                        if (a.zIndex > b.zIndex)
                            return -1;
                        if (a.zIndex < b.zIndex)
                            return 1;
                        return 0;
                    });//by zIndez, Desc

                tempArry[0].clicked();//Click object in front
                
                this.selectionArray = [];//Clear array after clicked() is run
            } else {   
                
            }

            //Check tool tip zone bounds
            if (this.toolTipActive) {
                if (this._inTipZone() == false) {
                    this.toolTipActive = false;
                }
            }

        },
        check: function (other) {
            //console.log("MOUSE TOUCHING");
            if (
                this.isClicking &&
                typeof (other.clicked) == 'function'
            ) {
                this.selectionArray.push(other);
            }

            if (other.entityType == 'button') {
                if (other.tooltip != "") {
                    this.toolTipActive = true;
                    this.tooltiptext.settext(other.tooltip);
                    this.toolTipZone = { x: other.pos.x, y: other.pos.y, w: other.size.x, h: other.size.y };
                }
            }

        },
        draw: function () {
            //this.parent();
            if (this.toolTipActive) {
                this.tooltiptext.write(this.pos.x - ig.game.screen.x, this.pos.y - ig.game.screen.y - (16));
            }
            //For tooltips, make object to check bounds. Run bounds check function and remove tooltip if out of bounds.

        },
        _inTipZone: function () {
            return ig.input.mouse.x + ig.game.screen.x > this.toolTipZone.x &&
                   ig.input.mouse.x + ig.game.screen.x < this.toolTipZone.x + this.toolTipZone.w &&
                   ig.input.mouse.y + ig.game.screen.y > this.toolTipZone.y &&
                   ig.input.mouse.y + ig.game.screen.y < this.toolTipZone.y + this.toolTipZone.h;
        },
    });

});