ig.module(
    'game.entities.hud'
)
.requires(
    'impact.entity'
)
.defines(function () {
    EntityHud = ig.Entity.extend({
        size: { x: 320, y: 20 },
        zIndex: 800,
        //animSheet: new ig.AnimationSheet( 'media/hud.png', 320, 20 ),
        collides: ig.Entity.COLLIDES.NEVER,
        gravityFactor: 0,

        //Custom Properties
        // HUD Items
        name: "gameHUD",

        //Images
        hud_armor_sheet: new ig.Image('media/armor_sheet_16x64.png'),
        hud_playerstatuseffects: new ig.Image('media/playerStatusEffectIcons.png'),
        hud_hardpointbaricons: new ig.Image('media/icon_hardpointbar.png'),
        hud_abilityicons: new ig.Image('media/abilities.png'),
        hud_ammoIcon: new ig.Image('media/ammoIcon.png'),
        hud_reloadIcon: new ig.Image('media/reloadIcon.png'),
        hud_armorIcon: new ig.Image('media/armorIcon.png'),
        hud_weaponIcons: new ig.Image('media/weapons.png'),
        
        
        // Load a font
        font: new ig.Font('media/04b03.font.png'),
        font20white: new ig.Font('media/fonts/visitor_s20_white.font.png', { borderColor: '#000', borderSize: 1 }),
        font20whiteFader: new ig.Font('media/fonts/visitor_s20_white.font.png', { borderColor: '#000', borderSize: 1 }),
        font16yellow: new ig.Font('media/fonts/visitor_s16_yellow.font.png', { borderColor: '#000', borderSize: 1 }),
        font10yellowbrown: new ig.Font('media/fonts/visitor_s10_yellowbrown.font.png', { borderColor: '#000', borderSize: 1 }),
        font20green: new ig.Font('media/fonts/visitor_s20_green.font.png', { borderColor: '#000', borderSize: 1 }),
        font20red: new ig.Font('media/fonts/visitor_s20_red.font.png', { borderColor: '#000', borderSize: 1 }),
        font20blue: new ig.Font('media/fonts/visitor_s20_blue.font.png', { borderColor: '#000', borderSize: 1 }),
        //Custom
        fontFadeTimer: null,
        endGameStatus: false,
        finalreportsent: false,
        winner: 0,
        //Hardpoint Eyecandy Array
        hardpointEnts: new Array(),
        //Command Menu Tracking Object
        cMenu: { sX: 0, sY: 0, eX: 0, eY: 0, open: false, selected: 0 },
        //DIV control
        chatOpen: false,
        hudToggle: 'none',
        commandMapToggle: false,
        commandMapBeaconSet: false,
        beaconTimer: null,
        //effects
        alerts: new Array(),
        alertsTimer: null,
        //Sounds
        theme_victory: null,
        theme_defeat: null,
        //reports
        deathreport: null,

        init: function (x, y, settings) {
            this.parent(x, y, settings);
            //Setup HUD Canvas dimensions
            $("#hudcanvas").css("width", $("#canvas").width());
            $("#hudcanvas").css("height", $("#canvas").height());
            this.hudcanvas = document.getElementById('hudcanvas');
            this.hudcanvasctx = hudcanvas.getContext('2d');
            this.hudcanvas.width = hudcanvas.clientWidth;
            this.hudcanvas.height = hudcanvas.clientHeight;


            this.pos.x = ig.game.screen.x;
            this.pos.y = ig.game.screen.y;
            if (!ig.global.wm) {
                this.theme_victory = soundManager.createSound({ id: 'music_endgamethemevictory', url: './media/sounds/endgame_win_Gaslamp_Funworks_q.mp3', volume: 100 });
                this.theme_defeat = soundManager.createSound({ id: 'music_endgamethemedefeate', url: './media/sounds/endgame_win_Gaslamp_Funworks_q.mp3', volume: 100 });
                }
            //Generate tile context
            //this.cxtHudIcons = this.hud_icons.data;
            //Enable Chat features
            $("#sendChatButton").unbind("click");
            $("#sendChatButton").click(function () {
                if (ig.global.chatcount < 5) {
                    ig.global.chatcount++;
                    var characterReg = /^\s*[a-zA-Z0-9.!?/@#$%-,\s]+\s*$/;//^[a-zA-Z0-9.-]+$

                    if (!characterReg.test($("#chatarea").val())) {
                        $('#chatparent').before('<span">Only certain special characters allowed.</span>');
                    } else {
                        //ig.game.gamesocket.announce({ text: ig.game.player.playerName + " : " + $("#chatarea").val() });
                        ig.game.gamesocket.socket.emit('chatLobbySendInGame', { id: ig.game.socketid, room: ig.global.SocketRoom, alias: ig.global.login.alias, msg: $("#chatarea").val() });
                    }
                    $("#chatarea").val("");
                    //Use a different thing than announce, so it allows a simple log of chat to exist.
                } else {
                    $warning = "<div style=\"display:table-row;width:100%;\"><div style=\"color:#44FFFF;\">SPAM FILTER ACTIVE</div></div>";
                    $("#chatlogTable").append($warning);
                    $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
                    //$('#chatparent').before('<span">SPAM FILTER ACTIVE: PLEASE WAIT BEFORE NEXT MESSAGE!</span>');
                }
            });

            //Make clickable DIV interface for hardpoints
            var chassisPos = { x: ig.system.width / 2 - 64, y: ig.system.height - 200 }
            //Set Chassis Transparency
            this.chassisSheet = new ig.AnimationSheet('media/chassis_mbt1x64x128.png', 128, 64);
            this.chassis_current = new ig.Animation(this.chassisSheet, 1, [0]),
            this.chassis_current.alpha = .5;

            for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
               //console.log("Player Hardpoint Location:" + ig.game.player.hardpoints[d].location);
                //Remove CSS defaults and readd them to remove any transition delays
                //Made a mistake here, I need to remove them for the individual DIV area bars.
                $("#" + ig.game.player.hardpoints[d].location).attr("style", "");
                $("#" + ig.game.player.hardpoints[d].location).removeClass("tankmenuhardpointDisabled");
                $("#" + ig.game.player.hardpoints[d].location).addClass("tankmenuhardpointEnabled");

                var boxLoc = this.getHardpointPlacement(ig.game.player.hardpoints[d].location);
                var animSheet = new ig.AnimationSheet('media/hardpointstatus_x16s.png', 16, 16);
                var hpTemp = {
                    idle: new ig.Animation(animSheet, 0.3, [3], true),
                    close: new ig.Animation(animSheet, 1, [3, 2, 1, 0], true),
                    open: new ig.Animation(animSheet, 1, [0, 1, 2, 3], true),
                    defend: new ig.Animation(animSheet, 0.3, [4], true),
                    faw: new ig.Animation(animSheet, 0.3, [5], true),
                    fat: new ig.Animation(animSheet, 0.3, [6], true),
                    hf: new ig.Animation(animSheet, 0.3, [7], true)
                };
                //var hpTemp = ig.game.spawnEntity(EntityEyecandy, chassisPos.x + boxLoc.x, chassisPos.y + boxLoc, {
                //    size: { x: 64, y: 64 },
                //    attach: {x:chassisPos.x + boxLoc.x ,y: chassisPos.y + boxLoc.y},
                //    animSheet: new ig.AnimationSheet('media/hud_hardpoint1.png', 64, 64),
                //    zIndex: 1000,
                //    tileSeries: [5],
                //    update: function () {
                //        this.pos.x = ig.game.screen.x + this.attach.x;
                //        this.pos.y = ig.game.screen.y + this.attach.y;
                //       //console.log("test:" + JSON.stringify(this.pos));
                //    },
                //});
                hpTemp.idle.alpha = .3;
                this.hardpointEnts.push(hpTemp);

                var indexOfImage = ig.game.player.hardpoints[d].wpid * -64;
                $("#" + ig.game.player.hardpoints[d].location).css("background", "url('media/weapons64.png') 0 " + indexOfImage + "px");

                //Make them clickable
                $("#" + ig.game.player.hardpoints[d].location).click(function () {
                    var $this = $(this);
                   //console.log("You clicked " + $this.attr("id"));
                });

                
                $("#" + ig.game.player.hardpoints[d].location + "orders").click({hpIndex: d}, function (event) {
                    var $this = $(this);
                   //console.log("You clicked " + $this.attr("id"));
                    $("#weaponMenuParent").attr("currentHP", event.data.hpIndex);
                    $("#weaponMenuParent").css("left", $this.offset().left);
                    $("#weaponMenuParent").css("top", $this.offset().top);
                        
                });
            }

            //Create Minimap Click Listeners
            //Command Map Button
            $("#commandMapBtn").css("left", 36 + "px");
            $("#commandMapBtn").css("bottom", 36 + "px");
            $("#commandMapBtn").click(function () {
                $("#playMapParent").css("left", 32 + "px");
                ig.game.hud.commandMapToggle = true;
            });
            $("#playMapBeacon").click(function () {
                ig.game.hud.commandMapBeaconSet = true;
            });
            $("#playMapClose").click(function () {
                $("#playMapParent").css("left", -1000 + "px");
                ig.game.hud.commandMapToggle = false;
            });
            $('#playMapContent').click(function (e) {
                var parentOffset = $(this).parent().offset();
                
                //or $(this).offset(); if you really just want the current element's offset
                var tilesize = ig.game.collisionMap.tilesize;
                var relX = (e.pageX - 0 - $(this).offset().left) * (tilesize);//25
                var relY = (e.pageY - 0 - $(this).offset().top) * (tilesize);//32

                

                console.log("Click:", e.pageX, e.pageY, parentOffset.left, parentOffset.top, $(this).offset().left, $(this).offset().top, relX, relY);
                if (ig.game.hud.commandMapBeaconSet) {
                    //Set beacon, lasts for 10 seconds
                    ig.game.hud.commandMapBeaconSet = false;
                    ig.game.spawnEntity(EntityBeacon, relX, relY, { lifespan: 10, team: ig.game.player.team });
                    //Create beacon for everyone else
                    ig.game.gamesocket.send('spawnBeacon', {
                        pos: { x: relX, y: relY },
                        lifespan: 10,
                        team: ig.game.player.team,
                    });
                } else {
                    //otherwise, just set waypoint
                    ig.game.screen.x = (relX) - (ig.system.width / 2);
                    ig.game.screen.y = (relY) - (ig.system.height / 2);

                    if (ig.game.screen.x < 0) { ig.game.screen.x = 0; };
                    if (ig.game.screen.x +  ig.system.width > ig.game.collisionMap.pxWidth) { ig.game.screen.x = ig.game.collisionMap.pxWidth - ig.system.width; };
                    if (ig.game.screen.y < 0) { ig.game.screen.y = 0; };
                    if (ig.game.screen.y + ig.system.height > ig.game.collisionMap.pxHeight) { ig.game.screen.y = ig.game.collisionMap.pxHeight - ig.system.height; };

                    //ig.game.mousePointerBox2d.shortClick(relX * 8, relY * 8);
                }
            });
            //Clear alerts every 3 seconds
            this.alertsTimer = new ig.Timer(6);
            //
            this.playerRespawnTimer = new ig.Timer();
            this.playerRespawnTimer.set(15);
            this.playerRespawnTimer.pause();
            //
            this.fontFadeTimer = new ig.Timer(2);
            //this.fontFadeTimer.pause();

            this.beaconTimer = new ig.Timer(3);
            //Start fog W - H - Tilesize
            //this.fog = new ig.Fog(180, 120, 16);
            
            //console.log("fog obj", this.fog);
            //this.fog.draw(this.viewedTile.bind(this));
            //Resort the entities
            ig.game.sortEntitiesDeferred();

        },
        setHardPointBehavior: function (behavior) {
            var hpIndex = parseInt($("#weaponMenuParent").attr("currentHP"));
           //console.log("Test Set HP behavior from Onclick : Hpindex " + hpIndex + " behavior " + behavior + " " + ig.game.player.hardpoints[hpIndex].location);
            $("#weaponMenuParent").css("left", "-256px");
            $("#weaponMenuParent").css("top", -"256px");
            $("#" + ig.game.player.hardpoints[hpIndex].location + "orders").attr("style", "position:relative; top:24px;right: 12px; height: 16px; width: 16px; background: url('media/action_icons.png')" + (behavior * -16) + "px 0 ;");
        },
        update: function () {
            this.parent();
            this.pos.x = ig.game.screen.x;
            this.pos.y = ig.game.screen.y;

            //reset beacon timers
            if (this.beaconTimer.delta() > 0) {
                //Use this for pings as well
                ig.game.gamesocket.socket.emit('pingCall', {});
                if(ig.global.playerIsHost){
                    ig.game.gamesocket.socket.emit('updateClocks', {
                        room: ig.global.SocketRoom,
                        hostime: ig.game.startGameClock.clock.delta(),//current host game time,
                    });
                }
                ig.game.gamesocket.ping.start = Date.now();
                //reset beacon
                this.beaconTimer.reset();
                //reset global chat count to avoid spam filter
                ig.global.chatcount = 0;
            }
            //Remove old alerts
            if (this.alertsTimer.delta() > 0) {
                this.alerts.splice(0, 1);
                this.alertsTimer.reset();
            }
            for(al = 0;al<this.alerts.length;al++){
                this.alerts[al].anim.update();
            }

            //Check Fade Timers
            //-//Control Alert Change
            if (this.fontFadeTimer.delta() < 0) {
                this.font20whiteFader.alpha = (((this.fontFadeTimer.delta() * -1)*100)/2)/100;
            }

            //Check player status
            if (!ig.game.player.active) {
                if (this.playerRespawnTimer.delta() > 0) {
                    if (ig.game.player.team == 2) {
                        var zone = ig.game.getEntityByName('team2spawn');
                    } else {
                        var zone = ig.game.getEntityByName('team1spawn');
                    };
                    var randOffsetX = Math.round(Math.random() * (16 - (-16)) + (-16));
                    var randOffsetY = Math.round(Math.random() * (16 - (-16)) + (-16));
                    ig.game.player.configspawn(zone.pos.x + (zone.size.x / 2) + randOffsetX, zone.pos.y + (zone.size.y / 2 ) + randOffsetY);
                }
            } else {
                if (ig.input.pressed('openCommandMap')) {
                    if (ig.game.hud.commandMapToggle == false) {
                        $("#playMapParent").css("left", 32 + "px");
                        ig.game.hud.commandMapToggle = true;
                    } else {
                        $("#playMapParent").css("left", -1000 + "px");
                        ig.game.hud.commandMapToggle = false;
                    }
                }
                if (ig.input.pressed('mapbeacon')) {
                    var tEntities = ig.game.getEntitiesByType(EntityBeacon);

                    if (tEntities.length < 10) {


                        ig.game.hud.commandMapBeaconSet = false;
                        ig.game.spawnEntity(EntityBeacon, ig.game.mousePointer.pos.x, ig.game.mousePointer.pos.y, { lifespan: 10, team: ig.game.player.team });
                        //Create beacon for everyone else
                        ig.game.gamesocket.send('spawnBeacon', {
                            pos: { x: ig.game.mousePointer.pos.x, y: ig.game.mousePointer.pos.y },
                            lifespan: 10,
                            team: ig.game.player.team,
                        });
                    } else {
                        ig.game.gamesocket.writeAnnouncement({ text: "Team " + ig.game.player.team + " has too many beacons! Wait for some to expire." });
                    }
                }
                if (ig.input.pressed('reload')) {
                    for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
                        var weapon = ig.game.player.hardpoints[d].weapon;
                        if (weapon.reloading == false) {
                            weapon.reloading = true;
                            weapon.reloadTimer.set(weapon.reloadTime);
                        }
                    }

                }
                //Update hardpoints
                this.updateHardPoints();
                if (ig.input.pressed("hudToggle")) {
                    this.font20whiteFader.alpha = 1;
                    this.fontFadeTimer.set(2);
                   //console.log("HUD TOGGLED!");
                    //this.hudToggle = !this.hudToggle;
                    if (this.hudToggle == 'none') {
                        this.hudToggle = 'weaponrange';
                    } else if (this.hudToggle == 'weaponrange') {
                        this.hudToggle = 'radarRange';
                    } else if (this.hudToggle == 'radarRange') {
                        this.hudToggle = 'all';
                    } else if (this.hudToggle == 'all') {
                        this.hudToggle = 'none';
                    }
                }
                if (ig.input.pressed("instagibself")) {
                    ig.game.player.death(ig.game.player.remoteId);
                    
                }
                if (ig.input.pressed('escape')) {
                    //Close all possible open menus
                    $("#tipsParent").css("top", -1000 + "px");
                    $("#optionsMenuParent").css("top", -1000 + "px");
                    $("#playMapParent").css("left", -1000 + "px");
                    ig.game.hud.commandMapToggle = false;
                    $("#userProfileDisplayParent").css("top", "-1000px");
                }
                if (ig.input.pressed('ultimate')) {
                    if (ig.game.player.abilitySlot1.ready == true) {
                        ig.game.player.abilitySlot1.triggerAbility();

                    }
                }
            }
            if (this.finalreportsent == false && this.endGameStatus == true) {
                if (ig.global.finalreportcount >= ig.global.scores.length - 1) {
                    this.finalreportsent = true;
                    console.log("send final scores");
                    //Send report if player is host
                    if (ig.global.playerIsHost) {
                        var endscoreobject = ig.game.gamesocket.updateEndGameScores();
                        console.log("send final score update for match from host");
                        ig.game.gamesocket.socket.emit('finalscoresmatchupdate', {
                            room: ig.global.SocketRoom,
                            remoteId: ig.game.player.remoteId,
                            matchid: ig.global.matchId,
                            gamedata: endscoreobject,
                            winner: ig.game.hud.winner
                        });
                    }
                }
            }

        },


        cMenuSelection: function(sX,sY,eX,eY){
            var deltaX = eX - sX;
            var deltaY = eY - sY;
            var checkPlane = 'n';
            //Is it a vertical, or a horizontal selection?
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                //Horizontal
                checkPlane = 'x';
            } else if (Math.abs(deltaX) < Math.abs(deltaY)) {
                //Vertical
                checkPlane = 'y';
            } else {
                //No Selection Made
                return 0;
            }

            if (checkPlane == 'x') {
                if (deltaX < 0) {
                    //left
                    return 3;
                } else {
                    //right
                    return 1;
                }
            } else if (checkPlane == 'y') {
                if (deltaY < 0) {
                    //up
                    return 2;
                } else {
                    //down
                    return 4;
                }
            } else {
                return 0;
            }
            
        },
        getHudCanvasImage: function () {

            this.hudcanvasctx.beginPath();
            this.hudcanvasctx.rect(0, 0, this.hudcanvas.clientWidth, this.hudcanvas.clientHeight);
            this.hudcanvasctx.fillStyle = "rgba(50, 50, 50, 1)";
            this.hudcanvasctx.fill();
            this.hudcanvasctx.closePath();
            
            this.hudcanvasctx.save();

            //Clip out regions for each friendly and the main player
            /// create path
            this.hudcanvasctx.beginPath();
            this.hudcanvasctx.arc((ig.game.player.pos.x + (ig.game.player.size.x / 2) - ig.game.screen.x) * ig.system.scale, (ig.game.player.pos.y + (ig.game.player.size.y / 2) - ig.game.screen.y) * ig.system.scale, ig.game.player.optics * ig.system.scale, 0, 2 * Math.PI);
            //this.hudcanvasctx.arc(50, (50), 64, 0, 2 * Math.PI);
            this.hudcanvasctx.closePath();

            /// set clipping mask based on shape
            this.hudcanvasctx.clip();

            /// clear anything inside it            
            this.hudcanvasctx.clearRect(0, 0, this.hudcanvas.clientWidth, this.hudcanvas.clientHeight);

            /// remove clipping mask
            this.hudcanvasctx.restore()

            var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
            for (var i = 0; i < tEntities.length; i++) {
                if (tEntities[i].team == ig.game.player.team) {
                    this.hudcanvasctx.save();
                    /// create path
                    this.hudcanvasctx.beginPath();
                    this.hudcanvasctx.arc((tEntities[i].pos.x + (tEntities[i].size.x / 2) - ig.game.screen.x) * ig.system.scale, (tEntities[i].pos.y + (tEntities[i].size.y / 2) - ig.game.screen.y) * ig.system.scale, tEntities[i].optics * ig.system.scale, 0, 2 * Math.PI);
                    //this.hudcanvasctx.arc(50, (50), 64, 0, 2 * Math.PI);
                    this.hudcanvasctx.closePath();
                    /// set clipping mask based on shape
                    this.hudcanvasctx.clip();

                    /// clear anything inside it            
                    this.hudcanvasctx.clearRect(0, 0, this.hudcanvas.clientWidth, this.hudcanvas.clientHeight);

                    /// remove clipping mask
                    this.hudcanvasctx.restore()
                }
            }

            //Draw image of other canvas.
            ig.system.context.globalAlpha = 0.2;
            ig.system.context.drawImage(this.hudcanvas, 0, 0);
            ig.system.context.globalAlpha = 1;
        },
        draw: function () {
            this.parent();
            this.getHudCanvasImage();

            ///////////////////////////////////////
            this.font20whiteFader.draw(ig.game.hud.hudToggle, ig.game.player.pos.x - ig.game.screen.x + 32, ig.game.player.pos.y - ig.game.screen.y - 72);
            //PING ig.game.gamesocket.ping.start
            this.font.draw((ig.game.gamesocket.ping.av), ig.system.width - 64, ig.system.height - 64);
            //Distance to wp
            //this.font.draw(Math.round(ig.game.attackpoint.distanceTo(ig.game.player)), ig.game.attackpoint.pos.x - ig.game.screen.x  +8, ig.game.attackpoint.pos.y - ig.game.screen.y - 12);
            if (ig.game.player.active == false || ig.game.startGame == false) {
                //Player is inactie, show black screen
                ig.system.context.beginPath();
                ig.system.context.rect(0, 0, ig.system.width * ig.system.scale, ig.system.height * ig.system.scale);
                ig.system.context.closePath();
                ig.system.context.fillStyle = "rgba(0, 0, 0, 1)";
                ig.system.context.fill();
                ig.system.context.lineWidth = 1;
                ig.system.context.strokeStyle = 'black';
                ig.system.context.stroke();
                if (this.endGameStatus) {

                    this.font20white.draw('Team:' + this.winner + " wins!", ig.system.width / 2, 64, ig.Font.ALIGN.CENTER);
                } else if (ig.game.startGame == false) {

                } else {
                    //Draw Respawn countdown
                    this.font16yellow.draw('YOU HAVE BEEN KILLED!', ig.system.width / 2, ig.system.height / 2 - 64, ig.Font.ALIGN.CENTER);
                    this.font.draw('Respawn in ' + (Math.round((this.playerRespawnTimer.delta() * -1) * 100) / 100) + " seconds", ig.system.width / 2, ig.system.height / 2, ig.Font.ALIGN.CENTER);
                    this.font.draw('--------------------------------------------------------', ig.system.width / 2, ig.system.height / 2 + 32, ig.Font.ALIGN.CENTER);
                    this.font.draw('DAMAGE SOURCES', ig.system.width / 2, ig.system.height / 2 + 40, ig.Font.ALIGN.CENTER);
                    this.font.draw('--------------------------------------------------------', ig.system.width / 2, ig.system.height / 2 + 48, ig.Font.ALIGN.CENTER);

                    for (var d = 0; d < ig.game.hud.deathreport.length; d++) {
                        this.font.draw(ig.game.hud.deathreport[d].playerName + "             :" + Math.round(ig.game.hud.deathreport[d].damage), ig.system.width / 2, (ig.system.height / 2) + 64 + (16 * d), ig.Font.ALIGN.CENTER);
                    }
                }
            } else {
                //Debug stuff for rhino issue
                //ig.game.socket.trackstats //trackstats: {noset:0, setlv: 0, setpos: 0},
                // this.font.draw('iostats-noset:' + ig.game.gamesocket.trackstats.noset, 34, 64, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-setlv:' + ig.game.gamesocket.trackstats.setlv, 34, 96, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-setpos:' + ig.game.gamesocket.trackstats.setpos, 34, 128, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-fixvel:' + ig.game.gamesocket.trackstats.fixvel, 34, 144, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-d:' + ig.game.gamesocket.trackstats.d, 128, 64, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-lv:' + JSON.stringify(ig.game.gamesocket.trackstats.lv), 128, 96, ig.Font.ALIGN.LEFT);
                // this.font.draw('iostats-cv:' + JSON.stringify(ig.game.gamesocket.trackstats.cv), 128, 128, ig.Font.ALIGN.LEFT);

                // this.font.draw('collision data:' + ig.game.player.collisionFriction.length, 34, 166, ig.Font.ALIGN.LEFT);
                // for (var x = 0; x < ig.game.player.collisionFriction.length; x++) {
                //     this.font.draw(JSON.stringify(ig.game.player.collisionFriction[x]), 34, 188 + (12*x), ig.Font.ALIGN.LEFT);
                // }

                // this.font.draw('collisiontracker data:', ig.system.width - 256, 144, ig.Font.ALIGN.LEFT);
                // for (var x = 0; x < ig.game.player.collisionTracker.length; x++) {
                //     this.font.draw(JSON.stringify(ig.game.player.collisionTracker[x]), ig.system.width - 64, 166 + (12 * x), ig.Font.ALIGN.RIGHT);
                // }


                this.drawMiniHud();
                //this.drawMiniMap();

                //Draw RADAR MAP
                ig.system.context.fillStyle = "rgba(" + 190 + "," + 190 + "," + 190 + "," + (50 / 255) + ")";
                ig.system.context.fillRect(ig.global.radarLocation.current, 0, ig.system.width / (2 * ig.system.scale), ig.system.height / (2 * ig.system.scale));


                //Center Points
                var centerPoint = { x: (ig.system.width/2) , y:(ig.system.height/2) };
                //Draw Center point
                ig.system.context.fillStyle = "rgba(" + 0 + "," + 255 + "," + 0 + "," + (255 / 255) + ")";
                ig.system.context.fillRect(ig.global.radarLocation.current + (centerPoint.x / (2 * ig.system.scale)), centerPoint.y / (2 * ig.system.scale), 4, 4);


                //Draw any players within radar range(player stealth property)
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                
                var bEntities = ig.game.getEntitiesByType(EntityBot);

                //Add bots to target listing
                for(var b=0;b< bEntities.length;b++){
                    tEntities.push(bEntities[b]);
                }

                for (var i in tEntities) {
                    if (tEntities[i].pos != undefined) {

                        //Position relative to player
                        var radarScale = 8;
                        var relPos = { x: (tEntities[i].pos.x - ig.game.player.pos.x) / radarScale, y: (tEntities[i].pos.y - ig.game.player.pos.y) / radarScale };

                        if (tEntities[i].team == ig.game.player.team) {
                            //On Team, so draw ally regardless of distance
                            fillstyle = "rgba(" + 40 + "," + 180 + "," + 40 + "," + (255 / 255) + ")";
                            ig.system.context.fillStyle = fillstyle;
                            ig.system.context.fillRect(ig.global.radarLocation.current + ((centerPoint.x + relPos.x)) / (2 * ig.system.scale), ((centerPoint.y + relPos.y) / (2 * ig.system.scale)), 4, 4);                                                      
                            
                        } else {
                            //Not on team, so only draw if within radar range.
                            fillstyle = "rgba(" + 255 + "," + 0 + "," + 0 + "," + (255 / 255) + ")";
                            if (tEntities[i].distanceTo(ig.game.player) <= tEntities[i].stealth) {
                                ig.system.context.fillStyle = fillstyle;
                                ig.system.context.fillRect(ig.global.radarLocation.current + ((centerPoint.x + relPos.x)) / (2 * ig.system.scale), ((centerPoint.y + relPos.y) / (2 * ig.system.scale)), 4, 4);
                            }
                        }

                    }
                }
                //Draw team health data
                var teamCount = 0;
               
                for (var n = 0; n < ig.global.scores.length;n++) {
                    if (ig.global.scores[n].team == ig.game.player.team && ig.global.scores[n].playerName != ig.game.player.playerName) {
                        teamCount++;
                        //Draw Team player data on left side.
                        this.font.draw("- " + (ig.global.scores[n].playerName) + " -", 24, 120 + (teamCount * 32), ig.Font.ALIGN.LEFT);
                        //Draw backgrounds
                        fillstyle = "rgba(" + 40 + "," + 40 + "," + 40 + "," + (80 / 255) + ")";
                        ig.system.context.fillStyle = fillstyle;
                        ig.system.context.fillRect(24 * ig.system.scale, ((128 + (teamCount * 32)) * (ig.system.scale)), (32) * ig.system.scale, 4 * ig.system.scale);

                        //Draw foregrounds
                        if (ig.global.scores[n].health.current <= 0) {
                            fillstyle = "rgba(" + 180 + "," + 40 + "," + 40 + "," + (255 / 255) + ")";
                        } else {
                            fillstyle = "rgba(" + 40 + "," + 180 + "," + 40 + "," + (255 / 255) + ")";
                        }                        
                        ig.system.context.fillStyle = fillstyle;
                        ig.system.context.fillRect(24 * ig.system.scale, ((128 + (teamCount * 32)) * (ig.system.scale)), (32 * Math.round(ig.global.scores[n].health.current / ig.global.scores[n].health.max)) * ig.system.scale, 4 * ig.system.scale);

                    }
                }
                
                //DRAW COMMAND MAP
                if (ig.game.hud.commandMapToggle) {
                    this.drawCommandMap();
                }


                
            }
            if (ig.input.pressed("scoreboard")) {
                //Update score information first and then open with position
                ig.game.gamesocket.updatePlayerBoardScores();
                $("#playLobbyParent").css("top", "100px");
            }
            if (ig.input.released("scoreboard")) {
                $("#playLobbyParent").css("top", "-1000px");
            }
        },
        viewedtile: function (x, y) {
            //For fog
            var fogcheck = false;
            //Need code to share allied line of sight
            var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
            for (var i = 0; i < tEntities.length;i++) {
                if (tEntities[i].team == ig.game.player.team) {
                    fogcheck = this.opticsFogCheck(tEntities[i].pos, tEntities[i].size, tEntities[i].optics, x, y);
                    //applicable to netplayer, so reveal
                    if (fogcheck) { return fogcheck; }
                }
            }
            //Not applicable to any Netplayer, so lastly, check player.
            fogcheck = this.opticsFogCheck(ig.game.player.pos,ig.game.player.size, ig.game.player.optics, x, y);
            return fogcheck;

        },
        opticsFogCheck: function(pos, size ,optRange,x,y){
            //Convert Player Position to tiles
            var pTileX = Math.floor(((pos.x + (size.x / 2)) - ig.game.screen.x) / 16);
            var pTileY = Math.floor(((pos.y + (size.y / 2)) - ig.game.screen.y) / 16);
            //Distance formula 
            var dx = (pTileX * 16) - (x * 16);
            var dy = (pTileY * 16) - (y * 16);
            var dist = (dx * dx) + (dy * dy);
            var r = (((Math.floor(optRange / 16)) - 1) * 16);

            if (dist < (r * r)) {
                return true;
            } else {
                return false;
            }
        },
        drawCommandMap: function () {

            var c = document.getElementById("playMapContent");
            var ctx = c.getContext("2d");
            //Clear the canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            //Get the background map
            var imageData = ig.global.levels[ig.global.SelectedLevel].minimapImg.large;
            ctx.putImageData(imageData, 0, 0);
            //Draw the player, his allies and his enemies within range.
            //Draw screen position on minimap
            var scaleDivider = (8 * ig.system.scale);
            var offsettop = 0;//-25
            var offsetleft = 0;//-32
            ctx.strokestyle = "rgba(" + 190 + "," + 190 + "," + 0 + "," + (255 / 255) + ")";
            ctx.strokeRect(offsetleft + (ig.game.screen.x / scaleDivider), offsettop + (ig.game.screen.y / scaleDivider), ig.system.width / scaleDivider, ig.system.height / scaleDivider);
            //Draw dot position on minimap
            ctx.fillStyle = "rgba(" + 0 + "," + 255 + "," + 0 + "," + (255 / 255) + ")";
            ctx.fillRect(offsetleft + (ig.game.player.pos.x / scaleDivider), offsettop + (ig.game.player.pos.y / scaleDivider), 4, 4);
            //Draw any players within radar range(player stealth property)
            var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
	        var bEntities = ig.game.getEntitiesByType(EntityBot);

            //Add bots to target listing
            for(var b=0;b< bEntities.length;b++){
                tEntities.push(bEntities[b]);
            }

            for (var i in tEntities) {
                if (tEntities[i].pos != undefined) {
                    if (tEntities[i].team == ig.game.player.team) {
                        //On Team, so draw ally regardless of distance
                        fillstyle = "rgba(" + 40 + "," + 180 + "," + 40 + "," + (255 / 255) + ")";
                            ctx.fillStyle = fillstyle;
                            ctx.fillRect(offsetleft + (tEntities[i].pos.x / scaleDivider), offsettop + (tEntities[i].pos.y / scaleDivider), 4, 4);
                    } else {
                        //Not on team, so only draw if within radar range.
                        fillstyle = "rgba(" + 255 + "," + 0 + "," + 0 + "," + (255 / 255) + ")";
                        if (tEntities[i].distanceTo(ig.game.player) <= tEntities[i].stealth) {
                            ctx.fillStyle = fillstyle;
                            ctx.fillRect(offsetleft + (tEntities[i].pos.x / scaleDivider), offsettop + (tEntities[i].pos.y / scaleDivider), 4, 4);
                        }
                    }
                    
                }
            }
            //Draw objectives
            var objectives = ig.game.getEntitiesByType(EntityObjective);
            for (var i in objectives) {
                if (objectives[i].pos != undefined) {
                    var fillstyle = "rgba(" + 252 + "," + 165 + "," + 3 + "," + (255 / 255) + ")";
                    ctx.fillStyle = fillstyle;
                    ctx.fillRect(0 + (objectives[i].pos.x / scaleDivider), 0 + (objectives[i].pos.y / scaleDivider), objectives[i].size.x / scaleDivider, objectives[i].size.y / scaleDivider);
                }

            }
            //Draw any beacons the player or his allies have placed.
            var tBeacons = ig.game.getEntitiesByType(EntityBeacon);
            for (var i in tBeacons) {
                if (tBeacons[i].pos != undefined) {
                    if (tBeacons[i].team == ig.game.player.team) {
                        fillstyle = "rgba(" + 105 + "," + 223 + "," + 215 + "," + (255 / 255) + ")";
                        ctx.beginPath();
                        ctx.arc(0 + (tBeacons[i].pos.x / scaleDivider), 0 + (tBeacons[i].pos.y / scaleDivider), (Math.round(ig.game.hud.beaconTimer.delta() * -1) * 3), 0, 2 * Math.PI, false);
                        ctx.fillStyle = fillstyle;
                        ctx.fill();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = '#003300';
                        ctx.stroke();
                        //ctx.fillRect(0 + (tBeacons[i].pos.x / (4 * ig.system.scale)), 0 + (tBeacons[i].pos.y / (4 * ig.system.scale)), (Math.round(ig.game.hud.beaconTimer.delta() * -1) * 3), (Math.round(ig.game.hud.beaconTimer.delta() * -1) * 3));
                    }
                }
            }

        },
        drawMiniMap: function () {
            //VERY SLOW, NEED SINGLE IMAGE
            xpos = 10;
            ypos = 10;
            var context = ig.system.context;
            for (var y = 0; y < ig.global.minimap.height; y++) {
                for (var x = 0; x < ig.global.minimap.width; x++) {
                    // If this tile is solid, find the rect of solid tiles starting
                    // with this one
                    
                    //var id = context.createImageData(1, 1); // only do this once per page
                    //var d = id.data;                        // only do this once per page
                    //d[0] = r;
                    //d[1] = g;
                    //d[2] = b;
                    //d[3] = a;
                    //myContext.putImageData(id, x, y);
                    if (ig.global.minimap.map[y][x] == "c") {
                        //Set color to red if it is "c" otherwise black
                        r = 100;
                        g = 0;
                        b = 0;
                        a = 100;
                    } else {
                        r = 100;
                        g = 100;
                        b = 100;
                        a = 100;
                    }
                    context.fillStyle = "rgba(" + r + "," + g + "," + b + "," + (a / 255) + ")";
                    context.fillRect(xpos + x, ypos + y, 1, 1);
                }
            }
        },
        drawMiniHud: function () {
            var context = ig.system.context;
            
            //Bar Backgrounds, in case I want to use them.
            context.fillStyle = "rgba(40, 40, 40, .3)";
            context.fillRect((ig.system.width/2 - 154) * ig.system.scale, (ig.system.height - 64) * ig.system.scale, 32 * ig.system.scale, 32 * ig.system.scale);
            context.fillStyle = "rgba(40, 40, 40, .3)";
            context.fillRect((ig.system.width / 2 - 154) * ig.system.scale, (ig.system.height - 72) * ig.system.scale, 32 * ig.system.scale, 8 * ig.system.scale);
            //Draw ability Cooldown bar
            if (ig.game.player.abilitySlot1.ready) {
                this.hud_abilityicons.drawTile(ig.system.width / 2 - 154, ig.system.height - 64, ig.game.player.abilitySlot1.id, 32);
            } else {
                this.hud_abilityicons.drawTile(ig.system.width / 2 - 154, ig.system.height - 64, ig.game.player.abilitySlot1.id + 9, 32);
            }
            if (ig.game.player.abilitySlot1.ready == false) {//False, so ability is currently running.
                //Bar background.
                context.fillStyle = "rgba(46, 88, 46, .9)";
                context.fillRect((ig.system.width / 2 - 154) * ig.system.scale, (ig.system.height - 64) * ig.system.scale, 32 * ig.system.scale, Math.round(32 * ((ig.game.player.abilitySlot1.cdtimer.delta() * -1) / ig.game.player.abilitySlot1.cooldown)) * ig.system.scale);
                //Draw ability active bar

                context.fillStyle = "rgba(46, 76, 88, .9)";
                context.fillRect((ig.system.width / 2 - 154) * ig.system.scale, (ig.system.height - 72) * ig.system.scale, Math.round(32 * ((ig.game.player.abilitySlot1.occurence.ticks) / ig.game.player.abilitySlot1.occurence.totalticks)) * ig.system.scale, 8 * ig.system.scale);
            }

            //Draw player status effects
            for (var e = 0; e < ig.game.player.statusEffects.length; e++) {
                if (ig.game.player.statusEffects[e].name == 'regen') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 0, 16);
                }else if (ig.game.player.statusEffects[e].name == 'movement') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 1, 16);
                } else if (ig.game.player.statusEffects[e].name == 'armor') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 2, 16);
                } else if (ig.game.player.statusEffects[e].name == 'movespeed') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 3, 16);
                } else if (ig.game.player.statusEffects[e].name == 'morale') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 4, 16);
                } else if (ig.game.player.statusEffects[e].name == 'turnRate') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 5, 16);
                } else if (ig.game.player.statusEffects[e].name == 'reversespeed') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 6, 16);
                } else if (ig.game.player.statusEffects[e].name == 'weapon-rof') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 7, 16);
                } else if (ig.game.player.statusEffects[e].name == 'weapon-reload') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 8, 16);
                } else if (ig.game.player.statusEffects[e].name == 'weapon-magsize') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 9, 16);
                } else if (ig.game.player.statusEffects[e].name == 'slowpercent') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 10, 16);
                } else if (ig.game.player.statusEffects[e].name == 'blind') {
                    this.hud_playerstatuseffects.drawTile(ig.system.width / 2 - 64 + (e * 20), ig.system.height - 80, 11, 16);
                }
                
                //Draw status bars for each cooldown
                context.fillStyle = "rgba(40, 240, 40, .6)";
                context.fillRect((ig.system.width / 2 - 64 + (e * 20) + 16) * ig.system.scale, (ig.system.height - 80) * ig.system.scale, (4 * ig.system.scale), Math.round(16 * ((ig.game.player.statusEffects[e].stack) / ig.game.player.statusEffects[e].stackmax * ig.system.scale)));
            }

            my_gradient = context.createLinearGradient(0, (ig.system.height - 44) * ig.system.scale, 0, (ig.system.height - 44 + 6) * ig.system.scale );
            my_gradient.addColorStop(0, "black");
            my_gradient.addColorStop(.3, "rgba(26, 145, 213, .8)");
            my_gradient.addColorStop(.7, "rgba(26, 145, 213, .8)");
            my_gradient.addColorStop(1, "black");
            context.fillStyle = my_gradient;
            context.fillRect(ig.system.width / 2 * ig.system.scale - 128, (ig.system.height - 44) * ig.system.scale, Math.round(128 * (ig.game.player.hp / ig.game.player.maxphp)) * ig.system.scale, 6 * ig.system.scale);
            //draw current HP number
            this.font10yellowbrown.draw(Math.round(ig.game.player.hp) + "/" + ig.game.player.maxphp, ig.system.width / 2 - 24, ig.system.height - 40);
            ////Morale bar color

            //Updated Armor Icons, Just using tiles and color to show status
            var frontTile = 3 - Math.floor(3 * (ig.game.player.chassisArmor3.hp / ig.game.player.chassisArmor3.maxhp));
            this.hud_armorIcon.drawTile(ig.system.width / 2 + 96, ig.system.height - 64, 0 + (4 * frontTile), 16);
            var backTile = 3 - Math.floor(3 * (ig.game.player.chassisArmor4.hp / ig.game.player.chassisArmor4.maxhp));
            this.hud_armorIcon.drawTile(ig.system.width / 2 + 96 + 16, ig.system.height - 80, 3 + (4 * backTile), 16);
            var leftTile = 3 - Math.floor(3 * (ig.game.player.chassisArmor1.hp / ig.game.player.chassisArmor1.maxhp));
            this.hud_armorIcon.drawTile(ig.system.width / 2 + 96, ig.system.height - 80, 2 + (4 * leftTile), 16);
            var rightTile = 3 - Math.floor(3 * (ig.game.player.chassisArmor2.hp / ig.game.player.chassisArmor2.maxhp));
            this.hud_armorIcon.drawTile(ig.system.width / 2 + 96 + 16, ig.system.height - 64, 1 + (4 * rightTile), 16);


            var chassisPos = {x:ig.system.width / 2 * ig.system.scale - 128, y:ig.system.height * ig.system.scale - 188}

            //Hardpoints
            for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
                //Draw Fire Angle if Mouse is held down.
                if (ig.input.state("leftButton") && ig.game.player.hardpoints[d].weapon.group == 1 && this.hudToggle == 'weaponrange') {
                    if (ig.game.player.hardpoints[d].weapon.arclimit == true) {
                        //arcAngle
                        //var lAngRad = (ig.game.player.hardpoints[d].weapon.lowerlimit).toRad();
                        //var uAngRad = (ig.game.player.hardpoints[d].weapon.upperlimit).toRad();

                        var lAngRad = (ig.game.player.body.GetAngle()) - ig.game.player.hardpoints[d].arcAngle.toRad();
                        var uAngRad = (ig.game.player.body.GetAngle()) + ig.game.player.hardpoints[d].arcAngle.toRad();

                        this.drawWeaponAngleDisplay(((ig.game.player.hardpoints[d].weapon.body.GetPosition().x / Box2D.SCALE) - ig.game.screen.x) * ig.system.scale, ((ig.game.player.hardpoints[d].weapon.body.GetPosition().y / Box2D.SCALE) - ig.game.screen.y) * ig.system.scale, lAngRad, uAngRad);

                    }
                }
                if (ig.input.state("rightButton") && ig.game.player.hardpoints[d].weapon.group == 2 && this.hudToggle == 'weaponrange') {
                    if (ig.game.player.hardpoints[d].weapon.arclimit == true) {
                        //var lAngRad = (ig.game.player.hardpoints[d].weapon.lowerlimit).toRad();
                        //var uAngRad = (ig.game.player.hardpoints[d].weapon.upperlimit).toRad();

                        var lAngRad = (ig.game.player.body.GetAngle()) - ig.game.player.hardpoints[d].arcAngle.toRad();
                        var uAngRad = (ig.game.player.body.GetAngle()) + ig.game.player.hardpoints[d].arcAngle.toRad();

                        this.drawWeaponAngleDisplay(((ig.game.player.hardpoints[d].weapon.body.GetPosition().x / Box2D.SCALE) - ig.game.screen.x) * ig.system.scale, ((ig.game.player.hardpoints[d].weapon.body.GetPosition().y / Box2D.SCALE) - ig.game.screen.y) * ig.system.scale, lAngRad, uAngRad);

                    }
                }

                //Set back to black stroke for context
                context.strokeStyle = 'black';
                //ig.game.player.hardpoints[d].weapon.indexId
                var startpoint = (ig.system.width / 2) - Math.round(((ig.game.player.hardpoints.length / 2) * 32));
                //context.fillStyle = "rgba(46, 76, 88, .5)";
                
                
                this.hud_weaponIcons.drawTile(startpoint + d * 32, ig.system.height - 72, ig.game.player.hardpoints[d].wpid * 6, 32, 24);
                if (ig.game.player.hardpoints[d].weapon.reloading) {
                    //context.fillRect((startpoint + d * 32) * ig.system.scale, (ig.system.height - 72) * ig.system.scale, 32 * ig.system.scale, Math.round(24 * ((ig.game.player.hardpoints[d].weapon.reloadTimer.delta() * -1) / ig.game.player.hardpoints[d].weapon.reloadTime)) * ig.system.scale);
                    var r = 8 * ig.system.scale;
                    var xO = (startpoint + d * 32 + 16) * ig.system.scale;
                    var yO = (ig.system.height - 72 + 16) * ig.system.scale
                    var startAngle = 0 * Math.PI;
                   
                    var per = 2 * ((ig.game.player.hardpoints[d].weapon.reloadTimer.delta() * -1) / ig.game.player.hardpoints[d].weapon.reloadTime);

                    context.strokeStyle = "rgba(243, 243, 243, .7)";
                    var endAngle = per * Math.PI;
                    context.beginPath();
                    context.arc(xO, yO, r, startAngle, endAngle, false);
                    context.lineWidth = 6;
                    context.stroke();

                    context.strokeStyle = "rgba(46, 76, 88, .7)";
                    var endAngle = per * Math.PI;
                    context.beginPath();
                    context.arc(xO, yO, r, startAngle, endAngle, false);
                    context.lineWidth = 4;
                    context.stroke();

                    
                }
                this.font.draw("x" + ig.game.player.hardpoints[d].weapon.ammoCurrent, startpoint + d * 32 + 8, ig.system.height - 64);
               
                //Set back to black stroke for context
                context.strokeStyle = 'black';
                
            }
        },
        drawWeaponAngleDisplay: function (x, y, angleLower, angleUpper) {
            var context = ig.system.context;
            context.strokeStyle = "rgba(102, 255, 51, .1)";
            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + 512 * Math.cos(angleLower), y + 512 * Math.sin(angleLower));
            context.stroke();

            context.beginPath();
            context.moveTo(x, y);
            context.lineTo(x + 512 * Math.cos(angleUpper), y + 512 * Math.sin(angleUpper));
            context.stroke();

            context.beginPath();
            context.arc(x, y, 128, angleLower, angleUpper);
            context.stroke();

            context.beginPath();
            context.arc(x, y, 512, angleLower, angleUpper);
            context.stroke();

            //context.beginPath();
            //context.arc(x, y, 1024, angleLower, angleUpper);
            //context.stroke();

            context.strokeStyle = 'black';
        },
        drawFogOfWar: function(){
            //My own take at doing a more quick rendering of FoW.

            //Get player center tile

            //Get bounds X-lower, X-Upper, Y-lower, Y-Upper

            //Do circle check for each tile in game, but do process them for a draw at all if they are not within those bounds.
            //(x - center_x)^2 + (y - center_y)^2 < radius^2

            //Then, check if they are within those bounds, but outside the circle. If so, draw their tile with a shader.
            //Finally, draw large rectangles for the bounding areas
        },
        getHardpointPlacement: function (locationString) {
            //1- Front-left, 2 Front-Center, 3 Front-Right, 4, Right-Front, 5 Left-Front
            //6 Center, 7 Right-Back, 8 Left-Back, 9 Back-Left, 10 Back-Center, 11 Back-Right
            //boundaries
            //f - 0, f2 = 216 * 1/4, b2 = 216*3/4, b = 216, l = 108-16, r = -16
            var cY = 64*2 * 1 / 2 - 16;
            var cX = 128 * 2 * 1 / 2 - 16;
            var f = 16;
            var b = 128*2 -16;
            var l = 64*2 - 16;
            var r = -16;
            var f2 = 128 * 2 * 1 / 4 - 16;
            var b2 = 128 * 2 * 3 / 4 - 16;
            if (locationString === "chassisFC") {
                return { x: f, y: cY };
            } else if (locationString === "chassisFR") {
                return { x: f, y: r };
            } else if (locationString === "chassisFL") {
                return { x: f, y: l };
            } else if (locationString === "chassisRF") {
                return { x: f2, y: r };
            } else if (locationString === "chassisRB") {
                return { x: b2, y: r };
            } else if (locationString === "chassisLF") {
                return { x: f2, y: l };
            } else if (locationString === "chassisLB") {
                return { x: b2, y: l };
            } else if (locationString === "chassisBR") {
                return { x: b, y: r };
            } else if (locationString === "chassisBC") {
                return { x: b, y: cY };
            } else if (locationString === "chassisBL") {
                return { x: b, y: l };
            } else if (locationString === "chassisC") {
                return { x: cX, y: cY };
            } else {
                return { x: cX, y: cY };
            }
        },
        selectHardPoint: function () {

        },
        updateHardPoints: function () {
            for (var d = 0; d < ig.game.player.hardpoints.length; d++) {
                if (ig.game.player.hardpoints[d].weapon.buttoned) {
                    this.hardpointEnts[d].close.update();                   
                }               
            }
        },
        endGame: function (team) {
            //If your team matches, display victory, otherwise display defeat.
            this.endGameStatus = true;
            this.winner = team;
            //GAME OVER, Gather REQUIRED ENDGAME SCORE DATA

            //Player tanked this much damage
            var playerIndex = ig.game.getScoreIndexByRemoteId(ig.game.player.remoteId);
            var playerDamageTaken = 0;
            var playerPointsCaptured = 0;
            if (playerIndex != -1) {
                playerDamageTaken = ig.global.scores[playerIndex].damageTaken;
                playerPointsCaptured = ig.global.scores[playerIndex].objEarned;
                playerDamageSources = ig.global.scores[playerIndex].damageSources;

            }
            ig.game.gamesocket.send('endGameScoreDisplay', {
                pointscaptured: playerPointsCaptured,
                damagetaken: playerDamageTaken,
                damageSources: playerDamageSources,
                remoteId: ig.game.player.remoteId,//Who is sending the report?

            });

            $("#egMenuHeaderText").html("TEAM " + ig.game.hud.winner + " wins");
            ig.game.gamesocket.updatePlayerBoardScores();
           
            $("#endGameParent").css("top", "64px");
            $("#scoreblipsparent").css("top", (-1000) + "px");
            //Emit update to database
            var endscoreobject = ig.game.gamesocket.updateEndGameScores();
            var playerIndex = ig.game.getScoreIndexByRemoteId(ig.game.player.remoteId);
            console.log("send final score update for player", playerIndex);
            ig.game.gamesocket.socket.emit('finalscoresupdate', {
                room: ig.global.SocketRoom,
                remoteId: ig.game.player.remoteId,
                matchid: ig.global.matchId,
                gamedata: endscoreobject,
                updateIndex: playerIndex,
                winner: ig.game.hud.winner
            });
            //update localstorage to avoid reconnect warning
            ig.game.gameStorage.set('lastMatchName', {
                matchname: ig.global.SocketRoom,
            });
            //Play Sound
            if (team == ig.game.player.team) {
                $("#egBannerImg").attr("src", "media/endgameBanner_win.png");
                //Stop all sounds
                for (var i = soundManager.soundIDs.length - 1; i >= 0; i--) {
                    soundManager.sounds[soundManager.soundIDs[i]].stop();
                }
                this.theme_victory.play();
            } else {
                $("#egBannerImg").attr("src", "media/endgameBanner_defeat.png");
                //Stop all sounds
                for (var i = soundManager.soundIDs.length - 1; i >= 0; i--) {
                    soundManager.sounds[soundManager.soundIDs[i]].stop();
                }
                this.theme_defeat.play();
            }
        },
    });
});