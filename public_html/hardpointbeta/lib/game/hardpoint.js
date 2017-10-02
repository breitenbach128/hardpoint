ig.module(
	'game.hardpoint'
)
.requires(
	'impact.game'
).defines(function () { //"use strict";

    hardpoint = ig.Class.extend({
        wpid: 0,
        location: "Center",
        arc: true,
        arcAngle: 45,
        refAngle: 0, 
        weapon: null,
        crewmanId: 0,
        group: 1,

        init: function (wpid, location, arc, refAngle, angle, weapon, group) {

            this.wpid = wpid;
            this.location = location;
            this.arc = arc;
            this.arcAngle = angle;
            this.referenceAngle = refAngle;
            this.weapon = weapon;
            this.group = group;
        }
    });


});