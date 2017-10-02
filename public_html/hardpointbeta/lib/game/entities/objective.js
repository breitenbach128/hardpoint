ig.module(
	'game.entities.objective'
)
.requires(
	'impact.entity',
	'plugins.box2d.entity'
)
.defines(function () {

    //Objective becomes "Active" once any body starts contact that is a player. After active, the timer performs AABB queries to check for contact every second. The teams are added up, and the most players wins a point.
    //If no player bodies are detected in a AABB cycle, the objective becomes inactive again.

    //I need to setup collision masks so it ONLY collides the sensor with player objects

    EntityObjective = ig.Box2DEntity.extend({
        size: { x: 128, y: 128 },
        type: ig.Entity.TYPE.NONE,
        checkAgainst: ig.Entity.TYPE.NONE,
        collides: ig.Entity.COLLIDES.NEVER, // Collision is already handled by Box2D!
        gravityFactor: 0,
        zIndex: 25,
        name: "ObjectiveA",
        //customBox2d
        bodyType: 'static',
        isSensor: true,
        //custom
        bodiesInZone: new Array,
        bodyInZone: false,
        obtype: "zone", //Flag, zone
        timeCountToControl: 15, //How many seconds until they earn a point?
        team1Points: 0,
        team2Points: 0,
        currentFlagPoints: 0,
        requiredPoints: 10,
        currentTeam: 0, //Which team, 1,2 or 0(neutrel) owns the point/flag?

        //Images
        obj_capturebar1: new ig.Image('media/objective_capturebar1.png'),
        obj_capturebar2: new ig.Image('media/objective_capturebar2.png'),

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            this.animSheet = new ig.AnimationSheet('media/zone_captureArea_1.png', 128, 128);
            this.addAnim('idle', .2, [0,1,2,3,4,5,6]);
            this.addAnim('team1', .2, [6,7,8,9,10,11,12]);//This timing works perfect right now. 1 to 4 ratio
            this.addAnim('team2', .2, [6,7, 8, 9, 10, 11, 12]);
            if (!ig.global.wm) {
                this.body.userData = "objective";
                this.pointTimer = new ig.Timer(this.timeCountToControl);
                this.pointTimer.pause();
                if (this.currentTeam == 1) { this.currentAnim = this.anims.team1; };
                if (this.currentTeam == 2) { this.currentAnim = this.anims.team2; };
            }
            ig.game.objectiveZone = this;
        },

        update: function () {
            this.parent()
            if (ig.game.hud.endGameStatus == false) {
                if (this.pointTimer.delta() >= 0) {

                    if (ig.global.playerIsHost && this.currentTeam != 0) {
                        //Game creator controls cycle. I'll need to code to send it to the next person if the host disconnects

                        ig.game.gamesocket.socket.emit('objectiveVictory', {
                            objectiveName: this.name,
                            winner: this.currentTeam,
                            remoteId: ig.game.player.remoteId,
                            room: ig.global.SocketRoom,
                        });
                    }

                    this.pointTimer.reset();
                }
                this.checkTeamPoint();//Check endgame condition
            }
        },

        draw: function () {
            this.parent()

            //Draw objective status
            if (this.currentTeam != 0) {
                var fillstyle = "rgba(" + 50 + "," + 50 + "," + 50 + "," + (80 / 255) + ")";
                ig.system.context.fillStyle = fillstyle;
                ig.system.context.fillRect((this.pos.x - ig.game.screen.x) * ig.system.scale, (this.pos.y - ig.game.screen.y - 16) * ig.system.scale, 128 * ig.system.scale, 16 * ig.system.scale);
                var timeDelta = Math.round(this.pointTimer.delta())
                if (timeDelta > 0) { timeDelta = 0 };
                if (isFinite(timeDelta)) {
                    var result = (timeDelta + this.timeCountToControl);
                    
                    //.draw( targetX, targetY, [sourceX], [sourceY], [width], [height]
                    if (this.currentTeam == 1) {
                        this.obj_capturebar1.draw(this.pos.x - ig.game.screen.x, this.pos.y - 16 - ig.game.screen.y, 0, 0, Math.round((result / this.timeCountToControl) * 128), 16);

                    } else {
                        this.obj_capturebar2.draw(this.pos.x - ig.game.screen.x, this.pos.y - 16 - ig.game.screen.y, 0, 0, Math.round((result / this.timeCountToControl) * 128), 16);
                    };
                }
 

            }
            //ig.system.context.drawImage(this.cxtstatusBars, 16 * ig.system.scale, 0 * ig.system.scale, 16 * ig.system.scale, 16 * ig.system.scale, this.pos.x * ig.system.scale + (this.size.x / 2) * ig.system.scale - ig.game.screen.x * ig.system.scale, this.pos.y * ig.system.scale - ig.game.screen.y * ig.system.scale - 20, this.team1Points*20, 8);
            //ig.system.context.drawImage(this.cxtstatusBars, 32 * ig.system.scale, 0 * ig.system.scale, 16 * ig.system.scale, 16 * ig.system.scale, this.pos.x * ig.system.scale + (this.size.x / 2) * ig.system.scale - ig.game.screen.x * ig.system.scale, this.pos.y * ig.system.scale - ig.game.screen.y * ig.system.scale - 20, this.team2Points*-1*20, 8);


        },
        setObjTimer: function(time){
            this.pointTimer.set(time);
        },
        checkZoneBalance: function(){
            var winner = 0;
            var t1ct = 0;
            var t2ct = 0;
            //console.log("Bodies array",JSON.stringify(this.bodiesInZone));
            for (var x = 0; x < this.bodiesInZone.length; x++) {
                if (this.bodiesInZone[x].team == 1) {
                    t1ct++;
                } else if (this.bodiesInZone[x].team == 2) {
                    t2ct++;
                }
            }
            if (t2ct > t1ct) {
                winner = 2;
            } else if (t1ct > t2ct) {
                winner = 1;
            }
           
            //console.log("new team took ownership of objective", winner," prev team:" ,this.currentTeam);
            if (winner != 0) {
                //Start owner timer.
                if (this.currentTeam != winner) {
                    this.currentTeam = winner;
                    this.setObjTimer(this.timeCountToControl);
                }

                //Check game tip for objectives
                ig.game.getTip(1, 32, 32,false);
                
            } else {
                this.currentTeam = winner;
                this.pointTimer.reset();
                this.pointTimer.pause();

            }
        },
        addBodyInZone: function (rid,team) {
            this.bodiesInZone.push({ rid: rid, team: team });
            this.checkZoneBalance();
            //if (ig.game.player.active) {
                //this.bodyInZone = true;
                //ig.game.gamesocket.socket.emit('objectiveAddplayer', {
                //    objectiveName: this.name,
                //    remoteId: ig.game.player.remoteId,
                //});

            //}
        },
        removeBodyInZone: function (rid) {
            var f = -1;
            for (var x = 0; x < this.bodiesInZone.length; x++) {
                if (this.bodiesInZone[x].rid == rid) {
                    f = x;
                }
            }
            if (f != -1) {
                this.bodiesInZone.splice(f, 1);
            }
            this.checkZoneBalance();
            //this.bodyInZone = false;
            //ig.game.gamesocket.socket.emit('objectiveRemoveplayer', {
            //    objectiveName: this.name,
            //    remoteId: ig.game.player.remoteId,
            //});
        },
        getBodyInZone: function () {
            
            var fixtureList = this.body.GetFixtureList();

            var aabb = fixtureList.GetAABB();

            // Query the world for overlapping shapes.

            this.bodiesInZone = [];
            ig.world.QueryAABB(this.getBodyCB, aabb);            
            return this.bodiesInZone;
        },
        getBodyCB: function (fixture) {
            //this.entCoords = new Box2D.Common.Math.b2Vec2(ig.game.objectiveZone.pos.x, ig.game.objectiveZone.pos.y);
            //if (fixture.GetShape().TestPoint(fixture.GetBody().GetTransform(), this.entCoords)) {
            //    ig.game.objectiveZone.bodiesInZone.push(fixture.GetBody());
            //    return true;
            //} else {
            //    return false;
            //}
            var foundBody = fixture.GetBody();
           //console.log("Body in Zone: " + foundBody.entity.name);
            if (foundBody.entity.name == 'player') {
                ig.game.objectiveZone.bodiesInZone.push(foundBody);
                return true;
            } else {
                return false;
            }

        },
        checkTeamPoint: function(){
            //console.log("Attempting AddTeamPoints net send");
            //Perform net send to trigger function on all clients to update point count on all local objective entities
            //THIS DOES NOT BROADCAST TO THE SENDER, NEED TO UPDATE LOCAL POINTS FIRST

            var winteam = 0;
            //Does the amount of flag captures meet the capture requirement?
            if (this.team1Points >= this.requiredPoints) {
                winteam = 1;

            } else if (this.team2Points >= this.requiredPoints) {
                winteam = 2;
            }
            if (winteam != 0) {


                ig.game.gamesocket.send('endGame', {
                    winner: winteam,
                    remoteId: ig.game.player.remoteId,//Who is sending the report?

                });

                ig.game.player.active = false;
                ig.game.hud.endGame(winteam);
            } 

            
        },
        addTeamPoints: function (team) {
            //Update scores for winner
            for (var sc = 0; sc < ig.global.scores.length; sc++) {
                if (ig.global.scores[sc].team == team) {
                    ig.global.scores[sc].objEarned++;
                }
            }
            //
            var teamstring = "";
            var currPoints = 0;
            var teamcolor = "#4cff00";
            if (team == 1) {
                this.team1Points++;
                teamstring = "#team1blips";
                currPoints = this.team1Points;
                teamcolor = "#0000FF";
                $("#team1scorearea").html(this.team1Points);
            } else if (team == 2) {
                this.team2Points++;
                teamstring = "#team2blips";
                currPoints = this.team2Points;
                teamcolor = "#FF0000";
                $("#team2scorearea").html(this.team2Points);
            };
            //update HTML
            //
            var htmlString = "";
            for (var p = 0; p < this.requiredPoints; p++) {
                if (p < currPoints) {
                    htmlString += "<div style=\"display: table-cell ;background-color: " + teamcolor + "; height: 32px; width: 32px;\"><div style=\"background: url('media/teampoint_foreground.png'); height: 32px; width: 32px;\"></div></div>";
                } else {
                    htmlString += "<div style=\"display: table-cell ;background-color: " + "#4cff00" + "; height: 32px; width: 32px;\"><div style=\"background: url('media/teampoint_foreground.png'); height: 32px; width: 32px;\"></div></div>";
                }
            }
            $(teamstring).html(htmlString);
        },


    });

});