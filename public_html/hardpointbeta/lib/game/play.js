//uses ig.game.setGame(MyGame) to set it to a new game instance. Just make mutile game instances, and declare the title loading game as the starting point for the canvas.

ig.module(
	'game.play'

)
.requires(
	'impact.game',
    //'impact.debug.debug',
	'impact.font',
    'plugins.box2d.game',
    'plugins.box2d.debug'

)
.defines(function () {

    PlayGame = ig.Box2DGame.extend({

        // Load a font
        font: new ig.Font('media/04b03.font.png'),
        //properties
        gravity: 0,

        //custom Properties
        layer_gameplay: 100,
        layer_items_notheld: 200,
        layer_HUD: 800,
        layer_buttons: 900,
        layer_pointer: 999,

        //gamevariables
        projectilePool: new Array(),//Holds projectiles
        startGame: false,
        startCountDownTime: 10,

        //sound


        //globalEntities
        
        //Collision Globals
        //BINARYS: 0,2,4,8,16,32,64,128,256,512,1024,2048,4096,8192,16384,32768
        //BYTE:    0,2,4,8,10,20,40,80,100,200,400,800,1000,2000,4000,8000
        //$vals | %{[convert]::ToString($_,16)}
        COL_ALL: 0xFFFF,
        COL_NONE: 0x0000,
        COL_PLAYER: 0x0002,        
        COL_NETPLAYER: 0x0004,
        COL_BULLET_LOCAL: 0x0008,
        COL_BULLET_NET: 0x0010,
        COL_PLAYER_ARMOR: 0x0020,
        COL_PLAYER_WEAPON: 0x0040,
        COL_NETPLAYER_WEAPON: 0x0080,
        COL_NETPLAYER_ARMOR: 0x0200,
        COL_BOT_ARMOR: 0x0400,
        COL_BOT_WEAPON: 0x0800,
        COL_BOT: 0x1000,
        GRP_PLAYER: 9,
        GRP_NETPLAYER: 8,
        GRP_BOT: 5,


        //Trackers for game awards
        deathCount: 0,
        firstbloodWinner: null,//Who killed the first enemy?
        
        

        init: function () {
            //Notification Manager
            this.note = new ig.NotificationManager();
            //Setup Storage
		    this.gameStorage =  new ig.Storage();
            //Setup Sound
            this.theme =  soundManager.createSound({ id: 'music_playtheme', url: './media/sounds/Exciting_Trailer.mp3', volume: 50 });
            this.theme.play({ volume: ig.global.musicMaster.applied });
            this.startGame = false;//Start the game? First make sure all players have ids.
            $("#GameBrowserParent").trigger("click");
            $("#canvas").click(function () {
                //$("#canvas").focus();
            });
            //console.log("Updating Weapon and class object information with " + JSON.stringify(ig.global.class));
            var classObjectCopy = JSON.parse(JSON.stringify(ig.global.class));

            ig.global.started = true;

            //Create game Databases
            ig.game.db = new DatabaseReader();
            //Set player Count
            ig.game.playerCount = 0;
            //Global Scores
            ig.global.scores = new Array();
            //Load Level
            this.loadLevel(ig.global.levels[ig.global.SelectedLevel].obj);
            this.debugDrawer = new ig.Box2DDebug(ig.world);
            //Create local player
            //Temp spawn location for testing
            var zone = ig.game.getEntityByName('team1spawn');

            //Open game Lobby Until game starts
            var lobbyPosition = { left: window.innerWidth / 2 - 350, top: 100 };
            $("#playLobbyParent").css("left", lobbyPosition.left + "px");
            $("#playLobbyParent").css("top", lobbyPosition.top + "px");

            $("#scoreblipsparent").css("top", (2) + "px");
            $("#chatparent").css("left", ($(window).width() - 32 - $("#chatparent").width()) + "px");
            //Option Menu Button
            $("#optMenuIngameOpen").css("top", 36 + "px");
            $("#optMenuIngameOpen").css("right", 36 + "px");
            $("#optMenuIngameOpen").click(function () {
                $("#optionsMenuParent").css("top", 50 + "px");
            });
            $("#openChatButton").css("bottom", 36 + "px");
            ig.game.player = ig.game.spawnEntity(EntityPlayer, zone.pos.x + zone.size.x / 2, zone.pos.y + zone.size.y / 2, classObjectCopy);
            //Create Multiplayer Socket && create local player
            ig.game.gamesocket = new ig.ImpactConnect(ig.game.player, classObjectCopy, 1337);           
            if (ig.game.player.heroic) {
                ig.game.gamesocket.socket.emit('setPlayerHeroic', {
                    remoteId: ig.game.player.remoteId,
                });
            }

            ig.game.hud = ig.game.spawnEntity(EntityHud, 0, 0, { health: 100 });


            ig.game.mousePointerBox2d = ig.game.spawnEntity(EntityPointerBox2d, 0, 0, {});
            ig.game.mousePointer = ig.game.spawnEntity(EntityPointer, 0, 0, {});
            //ig.game.placementtest = ig.game.spawnEntity(EntityPlacement, 0, 0, { attachedTo: ig.game.mousePointer });

            //ig.game.turrettest = ig.game.spawnEntity(EntityTurret, 300, 100, {});

            //Waypoint Entities
            //Movement
            //Attack Target
            ig.game.attackpoint = ig.game.spawnEntity(EntityWaypoint, -100, 0, { fadeOut: true, animSheet: new ig.AnimationSheet('media/setTarget.png', 32, 32) });//

            //ig.game.testNetPlayer = ig.game.spawnEntity(EntityNetplayer, 200, 50, {});
            ig.global.gametype = 'capture';
            //Create Objectives Array for capture point victory
            ig.game.capturePoints = this.getEntitiesByType(EntityObjective);
            //Setup HUD scores depending on gameplay type
            if (ig.global.gametype == 'flag') {
                ig.game.hud.reqFlagPoints = ig.game.capturePoints[0].requiredPoints;//I could set this per team if I wanted later.
            } else if (ig.global.gametype == 'capture') {
                ig.game.hud.reqObjectives = ig.game.capturePoints.length;
            }

            ig.game.sortEntitiesDeferred();//Resort the entities



            this.createListener();


            //Wake Up world
            var bodyList = ig.world.GetBodyList();
            for (b = 0; b < bodyList.length; b++) {
               //console.log("bodyPOS:" + bodyList[b].entity.pos.x + "," + bodyList[b].entity.pos.y);
                bodyList[b].SetAwake(false);
            }


            //GAME START PROCESS
            //Start game clock
            this.startGameClock = {
                started: false,
                clock: new ig.Timer(),
                clienttime: 0,
            };
            this.startGameClock.clock.pause();

            //Is this a reconnect or a new game?
            if (ig.global.auth.ssec == 0) {
                //Start game countdown timer and clock
                this.startGameSequence = {
                    started: false,
                    startGameTimer: new ig.Timer(10),
                };
                this.startGameSequence.startGameTimer.pause();
                
                //Set timer position
                $("#playLobbyCountdown").css("bottom", -($("#playLobbyCountdown").height()) - 64);
                $("#playLobbyCountdown").css("left", $("#playLobbyParent").width() / 2 - 128);
            } else {
                ig.game.startGame = true;
            }            



        },
        update: function () {//~~ does a bit flip for quick "floor" of ints.
            this.parent();
            this.note.update();
            //Start the game once all players are ready if it has not started yet
            if (ig.game.startGame == false) {
                if (!ig.global.tips[2].triggered) {
                    ig.game.getTip(2, 32, 32, false);
                }
                var readyCount = 0;
                var team1Ct = 0;
                var team2Ct = 0;
                for (var sc = 0; sc < ig.global.scores.length; sc++) {
                    if (ig.global.scores[sc].team == 1) {
                        team1Ct++;
                    } else if (ig.global.scores[sc].team == 2) {
                        team2Ct++;
                    };
                    if (ig.global.scores[sc].ready) { readyCount++; }
                }
                if (readyCount >= ig.global.scores.length && ig.global.scores.length != 0) {
                    if (this.startGameSequence.started == false) {
                        this.startGameSequence.started = true;
                        this.startGameSequence.startGameTimer.set(this.startCountDownTime);
                        //Center camera
                        if (ig.game.player.team == 2) {
                            var zone = ig.game.getEntityByName('team2spawn');
                        } else {
                            var zone = ig.game.getEntityByName('team1spawn');
                        }
                        //center camera on spawn area
                        ig.game.screen.x = zone.pos.x + (zone.size.x / 2) - (ig.system.width / 2);
                        ig.game.screen.y = zone.pos.y + (zone.size.y / 2) - (ig.system.height / 2);
                    }
                    if (this.startGameSequence.startGameTimer.delta() >= 0) {
                        ig.game.startGame = true;
                        $("#playLobbyCountdown").html("");
                        $("#playLobbyParent").css("top", "-1000px");
                        //Spawn in proper locations
                        if (ig.game.player.team == 2) {
                            var zone = ig.game.getEntityByName('team2spawn');
                        } else {
                            var zone = ig.game.getEntityByName('team1spawn');
                        };
                        //Set new spawn for the game start. 

                        var randOffsetX = Math.round(Math.random() * (16 - (-16)) + (-16));
                        var randOffsetY = Math.round(Math.random() * (16 - (-16)) + (-16));
                        ig.game.player.configspawn(zone.pos.x + (zone.size.x / 2) + randOffsetX, zone.pos.y + (zone.size.y / 2) + randOffsetY);
                       //console.log("Spawning at the following location:" + ig.game.player.team + ":" + (zone.pos.x + zone.size.x / 2 + randOffsetX) + "," + (zone.pos.y + zone.size.y / 2 + randOffsetY));

                        //Remove clickable player board settings, except kick
                        ig.game.gamesocket.updatePlayerBoardInformation();

                    } else {
                        //Perform team count check. Allow to start game, but warn.
                        //
                        var gameStartString = "Game Starts in... " + (-1 * Math.round(this.startGameSequence.startGameTimer.delta()));
                        if (team1Ct != team2Ct) {
                            gameStartString = gameStartString + "<br><span style=\"background-color: red;width: 200px\">Teams are uneven!.</span>";
                        }
                        $("#playLobbyCountdown").html(gameStartString);
                    }
                } else {

                    $("#playLobbyCountdown").html("");
                    this.startGameSequence.started = false;
                    this.startGameSequence.startGameTimer.reset();
                    this.startGameSequence.startGameTimer.pause();

                }

            } else {
                
                if (this.startGameClock.started == false) {

                    //Start game clock.
                    this.startGameClock.started = true;
                    this.startGameClock.clock.reset();
                    //Only let others know if this is a new start, reconnects are joining a game in progress.
                    if (ig.global.auth.ssec == 0) {
                        //Register game start on server.
                        var gamedataobj = new Array();
                        if (ig.global.playerIsHost) {
                            for (var l = 0; l < ig.global.scores.length; l++) {
                                gamedataobj.push({
                                    name: ig.global.scores[l].playerName,
                                    pgid: ig.global.scores[l].pgid,
                                    kills: 0,
                                    deaths: 0,
                                    assists: 0,
                                    given: 0,
                                    received: 0,
                                    caps: 0,
                                    team: ig.global.scores[l].team
                                });
                            }                            
                        }
                        ig.game.gamesocket.socket.emit('gameStarted', {
                            room: ig.global.SocketRoom,
                            remoteId: ig.game.player.remoteId,
                            matchid: ig.global.matchId,
                            gamedata: gamedataobj,
                            winner: 0,//Matches with 0 means they did not complete.
                        });
                    }
                }
                this.updateGameClock();
            }
            

        },
        updateGameClock: function () {
            var totalseconds = 0;
            if (ig.global.playerIsHost == false) {
                totalseconds = Math.round(ig.game.startGameClock.clienttime + this.startGameClock.clock.delta());
            } else {
                totalseconds = Math.round(this.startGameClock.clock.delta())
            }
            var seconds = totalseconds % 60;
            var minutes = Math.floor(totalseconds / 60);
            if (seconds < 10) { seconds = "0" + seconds }
            $("#gameclockarea").html(minutes + ":" + seconds);
        },
        draw: function () {
            // Draw all entities and backgroundMaps
            this.parent();
            this.note.draw(); 
            
            //Box2d Debuger Draw
            //this.debugDrawer.draw();
        },

        loadLevel: function (data) {
            // Remember the currently loaded level, so we can reload when
            // the player dies.
            this.currentLevel = data;

            // Call the parent implemenation; this creates the background
            // maps and entities.
            this.parent(data);

            //this.setupCamera();
        },
        
        wraptext: function (text, width) {
            var stringArr = text;
            var result = "";
            var charCount = 0;
            for (w = 0; w < stringArr.length; w++) {
                charCount++;

                if (stringArr[w] == " " && charCount >= width) {
                    result += '\n';
                    charCount = 0;

                } else {
                    result += stringArr[w]
                }
            }
            return result;
        },
        createListener: function () {
            var myListener = new Box2D.Dynamics.b2ContactListener();
            
            myListener.BeginContact = function (contact) {
                var body1 = contact.GetFixtureA().GetBody();
                var body2 = contact.GetFixtureB().GetBody();

                //Bullets
                if (body1.userData == 'solid' && body2.userData == 'bullet') {
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        body2.entity.hasCollided(0);//Removed kill calls since hasCollided does kill the bullet.
                    }
                } else if (body2.userData == 'solid' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        body1.entity.hasCollided(0);
                    }
                }
                //CURRENTLY, THIS COMMENTED OUT STUFF FIXES THE ISSUE, SO IT IS A COLLISION OR A SUBFUNCTION OF THE COLLISION RESULT THAT IS CAUSING THE ISSUE.

                //if (body1.userData == 'player' && body2.userData == 'bullet') {
                //    if (body2.entity.active) {
                //        body2.entity.active = false;
                //        body2.entity.hasCollided(body1.entity.remoteId);
                //    }
                //} else if (body2.userData == 'player' && body1.userData == 'bullet') {
                //    if (body1.entity.active) {
                //        body1.entity.active = false;
                //        body1.entity.hasCollided(body2.entity.remoteId);
                //    }
                //}
                if (body1.userData == 'netarmor' && body2.userData == 'bullet') {;
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        body2.entity.hasCollided(0);
                        //body2.entity.kill();
                    }
                } else if (body2.userData == 'netarmor' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        body1.entity.hasCollided(0);
                        //body1.entity.kill();
                    }
                }

                if (body1.userData == 'armor' && body2.userData == 'bullet') {;
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        if (body1.entity.team != body2.entity.team) {
                            body1.entity.hurtArmor(body2.entity.damage, body2.entity.bulletType, body2.entity.ownerRID);
                        }
                        body2.entity.hasCollided(0);
                        //body2.entity.kill();
                    }
                } else if (body2.userData == 'armor' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        if (body1.entity.team != body2.entity.team) {
                            body2.entity.hurtArmor(body1.entity.damage, body1.entity.bulletType, body1.entity.ownerRID);
                        }
                        body1.entity.hasCollided(0);
                        //body1.entity.kill();
                    }
                }
                //botarmor
	            if (body1.userData == 'botarmor' && body2.userData == 'bullet') {;
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        console.log("botarmor hit",body2.entity.damage, body2.entity.id,body2.entity.team );
                        if (body1.entity.owner.team != body2.entity.team) {
                            body1.entity.hurtArmor(body2.entity.damage, body2.entity.bulletType, body2.entity.ownerRID);
                        }
                        body2.entity.hasCollided(0);
                        //body2.entity.kill();
                    }
                } else if (body2.userData == 'botarmor' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        console.log("botarmor hit",body1.entity.damage, body1.entity.id,body1.entity.team );
                        if (body1.entity.team != body2.entity.owner.team) {
                            body2.entity.hurtArmor(body1.entity.damage, body1.entity.bulletType, body1.entity.ownerRID);
                        }
                        body1.entity.hasCollided(0);
                        //body1.entity.kill();
                    }
                }
                //Bot bullet hits
                if (body1.userData == 'bot' && body2.userData == 'bullet') {
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        console.log("bot hull hit",body2.entity.damage, body2.entity.id,body2.entity.team );
                        body2.entity.hasCollided(body1.entity.remoteId);
                    }
                } else if (body2.userData == 'bot' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        body1.entity.hasCollided(body2.entity.remoteId);
                        console.log("bot hull hit",body1.entity.damage, body1.entity.id,body1.entity.team );
                    }
                }
                //Netplayer bullet hits
                if (body1.userData == 'netplayer' && body2.userData == 'bullet') {
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        body1.entity.hurt();
                        body2.entity.hasCollided(body1.entity.remoteId);
                    }
                } else if (body2.userData == 'netplayer' && body1.userData == 'bullet') {
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        body2.entity.hurt();
                        body1.entity.hasCollided(body2.entity.remoteId);
                    }
                }
                //Turret Bullet Hits and Crush
                
                if (body1.userData == 'turret' && body2.userData == 'bullet') {
                    if (body1.entity.team != body2.entity.team) {
                        body1.entity.hurt(1);
                    }
                } else if (body2.userData == 'turret' && body1.userData == 'bullet') {
                    if (body1.entity.team != body2.entity.team) {
                        body2.entity.hurt(1);
                    }
                }
                if (body1.userData == 'turret' && body2.userData == 'netplayer') {
                    body1.entity.hurt(1);
                } else if (body2.userData == 'turret' && body1.userData == 'netplayer') {
                    body2.entity.hurt(1);
                }
                if (body1.userData == 'turret' && body2.userData == 'player') {
                    body1.entity.hurt(1);
                } else if (body2.userData == 'turret' && body1.userData == 'player') {
                    body2.entity.hurt(1);
                }
                ////Tank on tank impacts
                //if (body1.userData == 'netplayer' && body2.userData == 'armor') {
                //    var totalHealth = ig.game.player.maxphp + body1.entity.health.max;
                //    ig.game.player.tankCollision(body1.entity.remoteId, body2.entity.armorPosition, (ig.game.player.maxphp / totalHealth));
                //    //body1.SetLinearDamping(10);
                //    //ig.game.player.body.SetLinearDamping(10);
                //} else if (body2.userData == 'netplayer' && body1.userData == 'armor') {//was netplayer
                //    var totalHealth = ig.game.player.maxphp + body2.entity.health.max;
                //    ig.game.player.tankCollision(body2.entity.remoteId, body1.entity.armorPosition, (ig.game.player.maxphp / totalHealth));
                //    //ig.game.player.body.SetLinearDamping(10);
                //    //body2.SetLinearDamping(10);
                //}
                //Tank on tank impacts
                if (body1.userData == 'netarmor' && body2.userData == 'armor') {
                    //Get total health pool
                    var totalHealth = ig.game.player.maxphp + body1.entity.owner.health.max;
                    //Run function to add to collision.
                    ig.game.player.tankCollision(body1.entity.owner.remoteId, body2.entity.armorPosition, body1.entity.armorPosition, (ig.game.player.maxphp / totalHealth));
                } else if (body2.userData == 'netarmor' && body1.userData == 'armor') {
                    //Get total health pool
                    var totalHealth = ig.game.player.maxphp + body2.entity.owner.health.max;
                    //Run function to add to collision
                    ig.game.player.tankCollision(body2.entity.owner.remoteId, body1.entity.armorPosition, body2.entity.armorPosition, (ig.game.player.maxphp / totalHealth));
                }
                //placement
                if (body1.userData == 'placementmarker' && body2.userData == 'solid') {
                    body1.entity.startCollision();
                } else if (body1.userData == 'solid' && body2.userData == 'placementmarker') {
                    body2.entity.startCollision();
                }
                //Mouse
                if (body1.userData == 'player' && body2.userData == 'mouse2b') {

                } else if (body2.userData == 'mouse2b' && body1.userData == 'player') {

                }
                //Destructables
                if (body1.userData == 'bullet' && body2.userData == 'destructable') {
                    //console.log("Hit by Bullet :", body1.entity.name, body1.entity.active);
                    if (body1.entity.active) {
                        body1.entity.active = false;
                        body1.entity.hasCollided(0);
                        body1.entity.kill();
                        body2.entity.debris(body1.entity.damage);
                    }
                } else if (body2.userData == 'bullet' && body1.userData == 'destructable') {
                    //console.log("Hit by Bullet :", body2.entity.name, body2.entity.active);
                    if (body2.entity.active) {
                        body2.entity.active = false;
                        body1.entity.debris(body2.entity.damage);
                        body2.entity.hasCollided(0);
                        body2.entity.kill();
                    }
                }
                //Objectives
                if (body1.userData == 'objective' && body2.userData == 'player') {
                    body1.entity.addBodyInZone(body2.entity.remoteId, body2.entity.team);
                } else if (body2.userData == 'objective' && body1.userData == 'player') {
                    body2.entity.addBodyInZone(body1.entity.remoteId, body1.entity.team);
                }
                if (body1.userData == 'objective' && body2.userData == 'netplayer') {
                    body1.entity.addBodyInZone(body2.entity.remoteId, body2.entity.team);
                } else if (body2.userData == 'objective' && body1.userData == 'netplayer') {
                    body2.entity.addBodyInZone(body1.entity.remoteId, body1.entity.team);
                }
                //Waypoints
                if (body1.userData == 'waypoint' && body2.userData == 'player') {
                        body2.entity.stopMovement();
                    
                } else if (body2.userData == 'waypoint' && body1.userData == 'player') {
                        body1.entity.stopMovement();
          
                }
                //Powerups
                if (body1.userData == 'powerup' && body2.userData == 'armor') {
                    //console.log('powerup touched by armor');
                    body1.entity.collect();

                } else if (body2.userData == 'powerup' && body1.userData == 'armor') {
                    //console.log('powerup touched by armor');
                    body2.entity.collect();
                }
                if (body1.userData == 'powerup' && body2.userData == 'player') {
                    //console.log('powerup touched by armor');
                    body1.entity.collect();

                } else if (body2.userData == 'powerup' && body1.userData == 'player') {
                    //console.log('powerup touched by armor');
                    body2.entity.collect();
                }
                //Spawnzones
                if (body1.userData == 'spawnzone' && body2.userData == 'player') {
                    body1.entity.addBodyInZone();
                } else if (body2.userData == 'spawnzone' && body1.userData == 'player') {
                    body2.entity.addBodyInZone();
                }

                myListener.EndContact = function (contact) {
                    var body1 = contact.GetFixtureA().GetBody();
                    var body2 = contact.GetFixtureB().GetBody();
                    //Objectives
                    if (body1.userData == 'objective' && body2.userData == 'player') {
                        body1.entity.removeBodyInZone(body2.entity.remoteId);
                    } else if (body2.userData == 'objective' && body1.userData == 'player') {
                        body2.entity.removeBodyInZone(body1.entity.remoteId);
                    }
                    if (body1.userData == 'objective' && body2.userData == 'netplayer') {
                        body1.entity.removeBodyInZone(body2.entity.remoteId);
                    } else if (body2.userData == 'objective' && body1.userData == 'netplayer') {
                        body2.entity.removeBodyInZone(body1.entity.remoteId);
                    }
                    //Spawnzones
                    if (body1.userData == 'spawnzone' && body2.userData == 'player') {
                        body1.entity.removeBodyInZone();
                    } else if (body2.userData == 'spawnzone' && body1.userData == 'player') {
                        body2.entity.removeBodyInZone();
                    }
                    //reset tank on tank impact damping                    
                    if (body1.userData == 'netarmor' && body2.userData == 'armor') {
                        ig.game.player.endTankCollision(body1.entity.owner.remoteId);
                        //body1.SetLinearDamping(3);
                        //ig.game.player.body.SetLinearDamping(3);
                    } else if (body2.userData == 'netarmor' && body1.userData == 'armor') {
                        ig.game.player.endTankCollision(body2.entity.owner.remoteId);
                        //ig.game.player.body.SetLinearDamping(3);
                        //body2.SetLinearDamping(3);
                    }
                    //placement
                    if (body1.userData == 'placementmarker' && body2.userData == 'solid') {
                        body1.entity.endCollision();
                    } else if (body1.userData == 'solid' && body2.userData == 'placementmarker') {
                        body2.entity.endCollision();
                    }
                }
            };
            ig.world.SetContactListener(myListener);
        },
        createProjectile: function (id, partX, partY, xvel, yvel, grav) {
            
            //Check length of ig.game.particlePool
            if (ig.game.projectilePool.length > 0) {
                //Search for particle of same type that is inactive.
                var projectileFound = null;
                for (var p = 0; p < ig.game.projectilePool.length; p++) {
                    if (ig.game.projectilePool[p].particleType == partType && ig.game.projectilePool[p].active == false) {
                        projectileFound = ig.game.projectilePool[p];
                        break;
                    }
                }

                if (projectileFound != null) {
                    //--Move particle to position and reactivate with reactivate funciton (resets the values). Deactiveate replaces the previous kill function
                    projectileFound.reactiveate(partX, partY);
                    if (xSp != 0) { particleFound.vel.x = xSp; };

                } else {
                    //--If no particle found, create a brand new one and push it to the list.
                    var tempProjectile = ig.game.spawnEntity(EntityParticle, partX, partY, { });
                    if (xSp != 0) { tempProjectile.vel.x = xSp; };
                    ig.game.particlePool.push(tempProjectile);
                }

            } else {
                //Length is zero, so create new and push
                var tempProjectile = ig.game.spawnEntity(EntityParticle, partX, partY, { });
                if (xSp != 0) { tempProjectile.vel.x = xSp; };
                ig.game.particlePool.push(tempProjectile);
            }
        },
        convertAngleTo360: function(angle){
                var rotations = Math.round(angle / 360);
                if (rotations < 0) { rotations = rotations * -1 };
                if (rotations == 0) { rotations = 1 };

                if (angle < -180) {
                    angle = (360 * rotations) + angle;
                    
                };

                if (angle > 180) {
                    angle = (-360 * rotations) + angle;
                };
                return angle;
        },
        getTip: function (tipid, x, y, browsing) {
            if (ig.global.tipsEnabled.current) {
                
                ig.global.currentTip = tipid;
                if (ig.global.tips[tipid].triggered == false || browsing) {
                    ig.global.tips[tipid].triggered = true;
                    //Update the html text
                    $("#tipsImage").attr("src", ig.global.tips[tipid].imgsrc);
                    $("#tipdata").html(ig.global.tips[tipid].text);
                    //open the css
                    $('#tipsParent').css('left', x + "px");
                    $('#tipsParent').css('top', y + "px");
                }
            }
        },
        getlimitedAngle: function(angle){

            var rAngle = angle;
            var rotations = Math.round(angle / 360);
            if (rotations < 0) { rotations = rotations * -1 };
            if (rotations == 0) { rotations = 1 };
            //If Neg, left. If Positive, Right. Then just get the ranges within that.
            if (rAngle < -180) {
                rAngle = (360 * rotations) + rAngle;
            };
            if (rAngle > 180) {
                rAngle = (-360 * rotations) + rAngle;
            };

            return rAngle;
        },
        getEntityById: function (id) {
            for (var i in this.entities) {
                if (this.entities[i].id === id) {
                    return this.entities[i];
                }
            }
            return null;
        },
        getNetPlayerByRemoteId: function (id) {
            var tEntities = this.getEntitiesByType(EntityNetplayer);
            for (var i in tEntities) {
                if (tEntities[i].remoteId === id) {
                    return tEntities[i];
                }
            }
            return null;
        },
        getEntityByRemoteId: function (id) {
            var tEntities = [];
            var pEntities = this.getEntitiesByType(EntityPlayer);            
            var nEntities = this.getEntitiesByType(EntityNetplayer);
            var bEntities = this.getEntitiesByType(EntityBot);

            tEntities = pEntities.concat(nEntities,bEntities);

            //var tEntities = this.getEntitiesByType(EntityPlayer);  
            for (var i in tEntities) {
                if (tEntities[i].remoteId === id) {
                    return tEntities[i];
                }
            }
            return null;
        },
        getScoreIndexByRemoteId: function (id) {
            var found = -1;
            for (var i in ig.global.scores) {
                if (ig.global.scores[i].playerid === id) {
                    found = i;
                }
            }
            return found;
        },
        checkTankSpawn: function(x1,y1){
            var tEntities = [];
            var pEntities = this.getEntitiesByType(EntityPlayer);            
            var nEntities = this.getEntitiesByType(EntityNetplayer);
            var bEntities = this.getEntitiesByType(EntityBot);

            tEntities = pEntities.concat(nEntities,bEntities);
            var d = 9999;
            for(var i=0;i<tEntities.length;i++){
                var x2 = tEntities[i].pos.x;
                var y2 = tEntities[i].pos.y;

                var nd = Math.sqrt( (x1-x2)*(x1-x2) + (y1-y2)*(y1-y2) );
                if(nd < d){d = nd};//Set to new low
            }

            if(d < 224){
                return false;
            }else{
                return true;
            }

        },
        writenote: function (text, pos) {
            this.note.spawnNote(this.font, text, pos.x, pos.y,
                    { vel: { x: 0, y: 0 }, alpha: 0.5, lifetime: 2.2, fadetime: 0.3 });
        }
    });
    
});
