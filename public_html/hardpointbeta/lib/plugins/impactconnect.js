ig.module(
	'plugins.impactconnect'
)
.requires(
	'impact.impact'
).defines(function() {

    ig.ImpactConnect = ig.Class.extend({
        ping: { start: 0, end: 0 , lastthree: new Array(), av: 0,},
        trackstats: { noset: 0, setlv: 0, setpos: 0, fixvel: 0, d: 0, lv: 0, cv: 0 },
        netPlayerPositionToSet: new Array(),
        init: function (player, classobj, port) {

            this.chatsound1 = soundManager.createSound({ id: 'sound_chatsound1', url: './media/sounds/TinyButtonPush.mp3', volume: 100 });
            this.remoteId;
            //util.inspect(player.playerClass)
            var pClassobjString = JSON.stringify(classobj);
            //reconnecting wont work for now
            //Changed, it just ignores port now.
            this.socket = io.connect(ig.global.connectUrl, {
                'reconnect': false,
                'reconnection delay': 0,
                'max reconnection attempts': 0,
                'forceNew': true,
                'force new connection': true
                //'reconnect' : true,
                //'reconnection delay' : 500,
                //'max reconnection attempts': 10,
                //'timeout ': 5000,
            });
            // PING CHECK
            this.socket.on('pingResponse', function (errObj) {
                ig.game.gamesocket.ping.end = Date.now();
                if (ig.game.gamesocket.ping.lastthree.length == 3) {
                    ig.game.gamesocket.ping.lastthree.splice(0, 1);//Remove first one
                }
                ig.game.gamesocket.ping.lastthree.push(ig.game.gamesocket.ping.end - ig.game.gamesocket.ping.start);
                var av = 0;
                for (var p = 0; p < ig.game.gamesocket.ping.lastthree.length; p++) {
                    av += ig.game.gamesocket.ping.lastthree[p];
                }
                av = Math.round(av / ig.game.gamesocket.ping.lastthree.length);
                ig.game.gamesocket.ping.av = av;
                if (av > 300) {
                    //latency is too high, so DC perhaps with error message?
                    console.log("LATENCY IS HIGH - AVG:", av);
                }
            });
            //

            /**
			 * starts communication with server
			 */
            //handle connection client events
            this.socket.on('connect_error', function (errObj) {
                console.log("Connection Attempt Error", errObj);

            });
            this.socket.on('disconnect', function () {
                console.log("Client disconnect");
                if (ig.global.wasKicked == false) {
                    $("#serverConnectionNotice").css("top", "100px");
                } else {
                    ig.global.wasKicked = false;//Reset for future games
                }
            });
            this.socket.on('error', function () {
                console.log("Client error");
                $("#serverConnectionNotice").css("top", "100px");
            });
            this.socket.on('reconnect', function () {
                console.log("Client reconnect");
            });
            this.socket.on('reconnecting', function () {
                console.log("Client Reconnecting");
            });            
            this.socket.on('reconnect_attempt', function () {
                console.log("Client reconnect_attempt");
            });
            //Handle Player Manual Reconnect Event

            //Handle game start
            console.log("Emiting Start", "BOTS?", ($( "#ganmeaddbotsflag" ).is( ":checked" )));
           
            this.socket.emit('start', { pName: player.playerName, room: ig.global.SocketRoom, playerGID: ig.global.login.id, ishost: ig.global.playerIsHost, level: ig.global.SelectedLevel, pPerks: ig.global.perks, pClass: pClassobjString, auth: ig.global.auth, addbots:($( "#ganmeaddbotsflag" ).is( ":checked" )) });
			
            var socketOpen = this.socket;
			
            /**
			 * joining game
			 */
            this.socket.on('setRemoteId', function (rId) {
               console.log("setting remote ID: " + rId);
                player.remoteId = rId;
                this.remoteId = rId;
            });
            this.socket.on('roomfullwarning', function (data) {
                console.log("failed to join", data.rId, data.status);
                ig.system.setGame(MyGame);
            });
            //this.socket.on('updatePlayerCount', function (data) {
            //    ig.game.playerCount = data.pCount;
            //   //console.log("updating player count");
            //});
            this.socket.on('newhost', function (data) {
                
                if (data.remoteid == ig.game.player.remoteId) {
                    ig.global.playerIsHost = true;
                }
                var sc = ig.game.getScoreIndexByRemoteId(data.remoteid);
                console.log("New Host being assigned", sc, ig.global.scores[sc].playerName, data.remoteid);
                if (sc != -1) {
                    ig.global.scores[sc].ishost = true;
                    console.log("ID:", "#lobbyPlayer_" + ig.global.scores[sc].playerName, "htmlstring:", ig.global.scores[sc].playerName + " (" + ig.global.scores[sc].team + ")" + " *HOST*");
                    $("#lobbyPlayer_" + ig.global.scores[sc].playerName).html(ig.global.scores[sc].playerName + " (" + ig.global.scores[sc].team + ")" + " *HOST*");
                }
            });
            this.socket.on('join', function (data) {
                //Update room id
                ig.global.matchId = data.matchid;
                //Generate the new class object from the string data.
                //console.log("Join rcv: " + data.pName);
                newClassObj = JSON.parse(data.pClass);
                var team = 1;
                if (data.reconnect.result == true) {
                    console.log("Join rcv via reconnect: " + data.pName + " team:" + data.reconnect.team);
                    team = (data.reconnect.team)
                } else {
                    team = (data.teamAssign)
                }
                //Get Spawn Zones for teams               
                if (team == 2) {
                    var zone = ig.game.getEntityByName('team2spawn');
                } else {
                    var zone = ig.game.getEntityByName('team1spawn');
                }
                //socketOpen.emit('updateServerPlayerTeam', {
                //    remoteId: data.remoteId,
                //    team: team,
                //});
                data.team = team;
                data.classid = newClassObj.classid;

                if(data.remoteId != this.remoteId){

				    
                   //console.log("NetPlayer Joined:" + data.pName + " team: " + team);
                    var found = false;
                    var gScoreIndex = -1;
                    for (var t = 0; t < ig.global.scores.length; t++) {
                        if (ig.global.scores[t].playerid == data.remoteId) {
                            found = true;
                            gScoreIndex = t;
                            
                        }
                    }
                    if (!found) {
                        //Only spawn new players
                        console.log("spawn new player", data.pName);
                        var posRand = Math.floor(Math.random() * (50 - (-50)) + (-50));
                        var newplayertemp = ig.game.spawnEntity(EntityNetplayer, zone.pos.x + (zone.size.x / 2) + 64 * posRand, zone.pos.y + (zone.size.y / 2) + 64 * posRand, {
                            playerName: data.pName,
                            hardpoints: newClassObj.hardpoints,
                            stealth: newClassObj.stealth,
                            optics: newClassObj.optics,
                            classType: newClassObj.classType,
                            classId: newClassObj.classid,
                            density: newClassObj.density,
                            health: { current: newClassObj.hp, max: newClassObj.maxphp },
                        });
                        //Setup Custom variables				    
                        newplayertemp.handlesInput = false;
                        newplayertemp.remoteId = data.remoteId;
                        newplayertemp.team = team;//Just temp to allow FFA.
                        newplayertemp.scoretrackingindex = ig.global.scores.length;
                        ig.game.gamesocket.createPlayerTrackingData(data);

                    } else {
                        var nPlayer = ig.game.getNetPlayerByRemoteId(data.remoteId)
                        nPlayer.scoretrackingindex = gScoreIndex;
                    }

                } else {
                    //finished inital connect, so remove loading screen transition
                    $("#loadingscreen").css({
                        left: "-3000px"
                    });

                    ig.game.player.team = team;

                    //If this is a reconnect by a join, include the join socket id. If this local player IS NOT the joining player, then dont "respawn" them.
                    if (data.rejoindata.rejoin == true && data.rejoindata.sourcerid != this.remoteId) {

                    } else {
                        //Set initial spawn area params
                       
                        var randOffsetX = Math.round(Math.random() * (16 - (-16)) + (-16));
                        var randOffsetY = Math.round(Math.random() * (16 - (-16)) + (-16));
                        ig.game.player.configspawn(zone.pos.x + (zone.size.x / 2) + randOffsetX, zone.pos.y + (zone.size.y / 2) + randOffsetY);
                        //Set initial direction for facing.
                        if (team == 2) {
                            console.log("SettingAngleBEFORE", ig.game.player.body.GetAngle());
                            ig.game.player.body.SetPositionAndAngle(ig.game.player.body.GetPosition(), (3 / 4 * Math.PI));
                            ig.game.player.body.SetAngle((3/4*Math.PI));
                            console.log("SettingAngleAFTER", ig.game.player.body.GetAngle());
                        }
                        console.log("zone spawn area position", zone.pos.x + (zone.size.x / 2) + randOffsetX, zone.pos.y + (zone.size.y / 2) + randOffsetY);
                    }
                    //center camera on spawn area
                    ig.game.screen.x = zone.pos.x + (zone.size.x / 2) - (ig.system.width / 2);
                    ig.game.screen.y = zone.pos.y + (zone.size.y / 2) - (ig.system.height / 2);

                    var found = false;                    
                    for (var t = 0; t < ig.global.scores.length; t++) {
                        if (ig.global.scores[t].playerid == data.remoteId) {
                            found = true;
                            ig.game.player.scoretrackingindex = t;
                        }
                    }
                    if (!found) {
                        ig.game.player.scoretrackingindex = ig.global.scores.length;
                        ig.game.gamesocket.createPlayerTrackingData(data);
                    }

                    //Add bots if they are set
				    if(data.addbots){
                        //Create three bots, with names bot00,bot01, and bot02. Set evens to team 2, odd to team 1 for 4 total players.
                        //Generate random classids for random bots in the future.

                        var botSet = [ig.game.bot00,ig.game.bot01,ig.game.bot02];

                        for(var b=0;b<botSet.length;b++){
                            var useZone = ig.game.getEntityByName('team1spawn');
                            var useTeam = 1;
                            if(b % 2 == 0){
                                useZone = ig.game.getEntityByName('team2spawn');
                                var useTeam = 2;
                            }

                            var rX = useZone.pos.x + (useZone.size.x / 2) + Math.floor(Math.random() * (256 - (-256)) + (-256));
                            var rY = useZone.pos.y + (useZone.size.y / 2) +  Math.floor(Math.random() * (256 - (-256)) + (-256));

	                        while(ig.game.checkTankSpawn(randOffsetX,randOffsetY) == false){
                                rX = useZone.pos.x + (useZone.size.x / 2) + Math.floor(Math.random() * (256 - (-256)) + (-256));
                                rY = useZone.pos.y + (useZone.size.y / 2) +  Math.floor(Math.random() * (256 - (-256)) + (-256));
                            }

                            //Spawn Bot
	                        botSet[b] = ig.game.spawnEntity(EntityBot, rX, rY, {team:useTeam,classid:1,remoteId:("bot0" + b)});//
                            botSet[b].configspawn( rX, rY);
                        }

                        // //random spawn - team 2, make sure it is not within 224 of other tanks
                        // var zone2 = ig.game.getEntityByName('team2spawn');
                        // var zone1 = ig.game.getEntityByName('team1spawn');

                        // var randOffsetX = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        // var randOffsetY = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        // while(ig.game.checkTankSpawn(randOffsetX,randOffsetY) == false){
                        //     randOffsetX = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        //     randOffsetY = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        // }
                        // //!! Need to set the value as the per zone, to account for team 1 or team 2 when I do the == false check for checkTankSpawn
	                    // //Spawn bot - EntityBot
                        // ig.game.bot00 = ig.game.spawnEntity(EntityBot, zone1.pos.x + (zone1.size.x / 2) + randOffsetX, zone1.pos.y + (zone1.size.y / 2) + randOffsetY, {team:2,classid:1,remoteId:"bot00"});//
                        // ig.game.bot00.configspawn(zone2.pos.x + (zone2.size.x / 2) + randOffsetX, zone2.pos.y + (zone2.size.y / 2) + randOffsetY);

                        // while(ig.game.checkTankSpawn(randOffsetX,randOffsetY) == false){
                        //     randOffsetX = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        //     randOffsetY = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        // }
	                    // //Spawn bot - EntityBot
                        // ig.game.bot02 = ig.game.spawnEntity(EntityBot, zone1.pos.x + (zone1.size.x / 2) + randOffsetX, zone1.pos.y + (zone1.size.y / 2) + randOffsetY, {team:1,classid:1,remoteId:"bot02"});//
                        // ig.game.bot02.configspawn(zone2.pos.x + (zone2.size.x / 2) + randOffsetX, zone2.pos.y + (zone2.size.y / 2) + randOffsetY);

                        // //Random spawn  - team 1, make sure it is not within 224 of other tanks
                        // while(ig.game.checkTankSpawn(randOffsetX,randOffsetY) == false){
                        //     randOffsetX = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        //     randOffsetY = Math.floor(Math.random() * (256 - (-256)) + (-256));
                        // }
	                    // //Spawn bot - EntityBot
                        // ig.game.bot01 = ig.game.spawnEntity(EntityBot, zone1.pos.x + (zone1.size.x / 2) + randOffsetX, zone1.pos.y + (zone1.size.y / 2) + randOffsetY, {team:2,classid:1,remoteId:"bot01"});//
                        // ig.game.bot01.configspawn(zone1.pos.x + (zone1.size.x / 2) + randOffsetX, zone1.pos.y + (zone1.size.y / 2) + randOffsetY);
                        
                    }

                }
                //Since someone joined, set everyones ready status to false, unless it is a rejoin, or join in progress. Then just set the ready count to true
                if (data.gamestarted) {
                    //Set time to be only 3 seconds instead of 10.
                    ig.game.startCountDownTime = 3;
                    //Set everyone to ready.
                    for (var t = 0; t < ig.global.scores.length; t++) {
                        ig.global.scores[t].ready = true;
                    }
                } else {
                    for (var t = 0; t < ig.global.scores.length; t++) {
                        ig.global.scores[t].ready = false;
                    }
                }
            });
            //Client Game clock sync
            this.socket.on('updateclientclocks', function (data) {
                ig.game.startGameClock.clienttime = data.hostime;
                ig.game.startGameClock.clock.set(0)
                
            });
			
            /**
			 * spawns simple entity you cant control
			 * info: class comes as string and needs the eval, because socket.io (?) strips all prototypes
			 */
            this.socket.on('spawnSimpleEntity', function (data) {
                //console.log('spawnSimpleEntity Broadcast', data);
                ig.game.spawnEntity(eval(data.ent), data.x, data.y, data.settings);
            });
            //
            this.socket.on('spawnEyeCandyFromDB', function (data) {
                //console.log('spawnEyeCandyFromDB Broadcast', data);
                var settings = ig.game.db.eyeCandyDBArray[data.index];;
                ig.game.spawnEntity(eval(data.ent), data.x, data.y, settings);
            });
            //Need update just for bullet. the simple ent wont work. I need to send the owner information for position.
            //And the bulletVel.
            this.socket.on('spawnBulletEnt', function (data) {
                ig.game.gamesocket.spawnBullet(data);
            });
            this.socket.on('spawnHitScan', function (data) {
                var bulletSettings = ig.game.db.projectileDbArray[data.bulletId];
                var bullet = ig.game.spawnEntity(eval(data.ent), data.x, data.y, bulletSettings);
                bullet.ownerRID = data.remoteId;
                bullet.team = data.team;
            });
            //turret spawn
            this.socket.on('spawnTurret', function (data) {
                //console.log("turretSpawn data:", data);

                var settings = data.settings;

                settings.setOwnerByRid = data.remoteId;
                settings.team = data.team;
                settings.isNetClone = true;

                ig.game.spawnEntity(EntityTurret, data.box2dpos.x / Box2D.SCALE, data.box2dpos.y / Box2D.SCALE, settings);
            });
            //beacon spawn
            this.socket.on('spawnBeacon', function (data) {
                ig.game.spawnEntity(EntityBeacon, data.pos.x, data.pos.y, { lifespan: data.lifespan, team: data.team });
            });
            //Deal straight damage
            this.socket.on('dealdamage', function (data) {
                console.log("dealdamage send called", data, ig.game.player.remoteId);
                if (ig.game.player.remoteId == data.remoteId) {
                    //deal damage to that armor that matches.

                    var armorent = null;
                    //r-l-f-b this.chassisArmor4
                    if (data.armorlocation == 'right') {
                        armorent = ig.game.player.chassisArmor1;
                    } else if (data.armorlocation == 'left') {
                        armorent = ig.game.player.chassisArmor2;
                    } else if (data.armorlocation == 'front') {
                        armorent = ig.game.player.chassisArmor3;
                    } else if (data.armorlocation == 'back') {
                        armorent = ig.game.player.chassisArmor4;
                    }
                    if (armorent != null) {
                        //console.log("hurting armor from deal damage call", armorent.armorPosition);
                        armorent.damageQueue.push({ dam: data.damage, type: data.type, rid: data.source })
                    }
                }
            });
            //Setup Netplayer collision status for effects            
            this.socket.on('setcollisionstatus', function (data) {
                var netEnt = ig.game.getNetPlayerByRemoteId(data.remoteId);
                if (netEnt != null) {
                    //console.log("collisiondata set on netEnt", data);
                    netEnt.setCollisionData(data.collisiondata);
                }
            });
            //Apply Visual Effects from DB
            this.socket.on('applyAbilityEffect', function (data) {
                var netEnt = ig.game.getNetPlayerByRemoteId(data.rid);
                if (netEnt != null) {
                    if (data.applyTo == 'weapons') {
                        for (var d = 0; d < netEnt.hardpoints.length; d++) {
                            //Create effect
                            var weapon = netEnt.hardpoints[d].weapon;
                            var settings = ig.game.db.eyeCandyDBArray[data.effectIndex];
                            var eff = ig.game.spawnEntity(EntityEyecandy, weapon.pos.x, weapon.pos.y, settings);//
                            //Attach to weapon
                            if (data.attached) {
                                eff.attachTo(weapon);
                            }

                        }
                    } else if (data.applyTo == 'self') {
                        var settings = ig.game.db.eyeCandyDBArray[data.effectIndex];
                        var eff = ig.game.spawnEntity(EntityEyecandy, netEnt.pos.x, netEnt.pos.y, settings);//
                        if (data.attached) {
                            eff.attachTo(netEnt);
                        }
                    } else if (data.applyTo == 'target') {

                    }
                }
                
            });
            //Apply effects from other abilities triggers
            this.socket.on('applystatuseffects', function (data) {
                
                for (var r = 0; r < data.remoteIdArray.length; r++) {
                    
                    if (ig.game.player.remoteId == data.remoteIdArray[r].remoteId) {
                        
                        for (var s = 0; s < data.statEffect.statstomod.length; s++) {
                            //stat: 'movespeed', value: 8 , secondsDuration: 1
                            ig.game.player.addStatusEffect(data.statEffect.statstomod[s].stat, data.statEffect.statstomod[s].secondsDuration, data.statEffect.statstomod[s].value, false)
                        }                        
                    }
                }
            });
            /**
			 * player state sync
			 */
            this.socket.on('statesync', function (sentdata) {
                try {
                    //console.log("Recived sync state from server");
                    for (var pdata = 0; pdata < sentdata.roomstate.length; pdata++) {
                        
                        var data = sentdata.roomstate[pdata];
                        if (data.remoteId != ig.game.player.remoteId) {//Only process updates for net players

                            var ent = ig.game.getEntityByRemoteId(data.remoteId);
                            var id = data.remoteId;
                            var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                            for (var i in tEntities) {
                                if (tEntities[i].remoteId === id) {
                                    ent = tEntities[i];
                                }
                            }
                            if (ent != null) {
                                //update ent health
                                ent.health = data.health;
                                if (ent.scoretrackingindex != null && ent.scoretrackingindex != -1) {
                                    ig.global.scores[ent.scoretrackingindex].health = data.health;
                                }

                                //Check distance
                                entpos = ent.body.GetPosition();

                                x1 = data.pos.x * Box2D.SCALE;
                                y1 = data.pos.y * Box2D.SCALE;
                                x2 = entpos.x;
                                y2 = entpos.y;
                                var d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
                                ig.game.gamesocket.trackstats.d = d;
                                ig.game.gamesocket.trackstats.lv = data.linearVel;
                                ig.game.gamesocket.trackstats.cv = ent.body.GetLinearVelocity();
                                
                                //basically, I can tweak this to adjust the velX, velY * 2, where 2 would grow with the more extreme correction based on distance.
                                if (d >= .32 && d < .64) { //100 pixels per meter, so .01 p/m. This would make it 32 pixels off.
                                    ig.game.gamesocket.trackstats.setlv++;
                                    //Directed angle from vector ent to vector data.pos
                                    var angle = Math.atan2(y1, x1) - Math.atan2(y2, x2);
                                    if (angle < 0) { angle += 2 * Math.PI };//Normalize it to 0..2 PI 

                                    //Add vectors to get correction / or Generate velocities
                                    velX = Math.cos(angle) * 2;//2 is the speed of movement here.
                                    velY = Math.sin(angle) * 2;//2 is the speed of movement here.

                                    ent.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(-velX, -velY), ent.body.GetPosition());

                                } else if (d >= .64) {
                                    ig.game.gamesocket.trackstats.setpos++;
                                    //Check if having a collision with and DONT SYNC POSITION SET IF SO
                                    var chk = false;
                                    for (var c = 0; c < ig.game.player.collisionFriction.length; c++) {
                                        if (ig.game.player.collisionFriction[c].rid == data.remoteId) {
                                            chk = true;
                                        }

                                    }
                                    if (!chk) {//ONLY SET POSITION IF CHECK IS FALSE, SO NO COLLISION IS HAPPENING

                                        //var chk = -1;

                                        //for (var i = 0; i < ig.game.gamesocket.netPlayerPositionToSet.length; i++) {
                                        //    if (ent.remoteId == ig.game.gamesocket.netPlayerPositionToSet[i].ent.remoteId) {
                                        //        chk = i;
                                        //    }
                                        //}

                                        //if (chk != -1) {
                                        //    ig.game.gamesocket.netPlayerPositionToSet[chk].armor = data.armor;
                                        //    ig.game.gamesocket.netPlayerPositionToSet[chk].pos = data.pos;
                                        //} else {
                                        //    ig.game.gamesocket.netPlayerPositionToSet.push({ ent: ent, armor: data.armor, pos: data.pos });
                                        //}

                                        //set chassis positions
                                        ent.body.SetPosition(new Box2D.Common.Math.b2Vec2(data.pos.x * Box2D.SCALE, data.pos.y * Box2D.SCALE));
                                        //Set armor positions
                                        //MIGHT NEED VEL FOR THESE GUYS
                                        //ent.chassisArmor3.SetPosition(new Box2D.Common.Math.b2Vec2(data.armor.f.pos.x * Box2D.SCALE, data.armor.f.pos.y * Box2D.SCALE));
                                        //ent.chassisArmor4.SetPosition(new Box2D.Common.Math.b2Vec2(data.armor.b.pos.x * Box2D.SCALE, data.armor.b.pos.y * Box2D.SCALE));
                                        //ent.chassisArmor1.SetPosition(new Box2D.Common.Math.b2Vec2(data.armor.r.pos.x * Box2D.SCALE, data.armor.r.pos.y * Box2D.SCALE));
                                        //ent.chassisArmor2.SetPosition(new Box2D.Common.Math.b2Vec2(data.armor.l.pos.x * Box2D.SCALE, data.armor.l.pos.y * Box2D.SCALE));
                                    }
                                        //Set velocities
                                        ent.body.SetLinearVelocity(data.linearVel);

                                        //ent.chassisArmor3.body.SetLinearVelocity(data.armor.fv);
                                        //ent.chassisArmor4.body.SetLinearVelocity(data.armor.bv);
                                        //ent.chassisArmor1.body.SetLinearVelocity(data.armor.rv);
                                        //ent.chassisArmor2.body.SetLinearVelocity(data.armor.lv);
                                    
                                } else {
                                    ig.game.gamesocket.trackstats.noset++;
                                    ent.body.SetLinearVelocity(data.linearVel);
                                    //ent.chassisArmor3.body.SetLinearVelocity(data.armor.fv);
                                    //ent.chassisArmor4.body.SetLinearVelocity(data.armor.bv);
                                    //ent.chassisArmor1.body.SetLinearVelocity(data.armor.rv);
                                    //ent.chassisArmor2.body.SetLinearVelocity(data.armor.lv);
                                }

                                ent.body.SetAngularVelocity(0);
                                ent.body.SetAngle(data.angle);

                                //Update Weapon Angles				    
                                var wpAngleUpdates = JSON.parse(data.wpangles);
                                for (wp = 0; wp < wpAngleUpdates.length; wp++) {
                                    ent.hardpoints[wp].weapon.body.SetAngle(wpAngleUpdates[wp]);
                                }


                                if (ent.remoteAnim != data.remoteAnim) {

                                    var newAnim = "ent.anims." + data.remoteAnim;
                                    ent.currentAnim = eval(newAnim);
                                    ent.remoteAnim = data.remoteAnim;
                                }
                            }
                        }
                    }
                    //Spawn synced projectiles
                    for (var prjdata = 0; prjdata < sentdata.projectilespawn.length; prjdata++) {
                        //Already spawned on this players screen, so no reason to spawn it again.
                        //console.log("received projectile spawn data from state sync!", prjdata, sentdata.projectilespawn[prjdata]);
                        if (sentdata.projectilespawn[prjdata].remoteId != ig.game.player.remoteId) {
                            //console.log("using function, spawnBullet");
                            ig.game.gamesocket.spawnBullet(sentdata.projectilespawn[prjdata]);
                        }
                    }
                } catch (e) {

                }
            });
            /**
			 * moving and animations
			 */
            //this.socket.on('move', function(data){
            //    try{
            //        var ent = ig.game.getEntityByRemoteId(data.remoteId);
            //        var id = data.remoteId;
            //        var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
            //        for (var i in tEntities) {
            //            if (tEntities[i].remoteId === id) {
            //                ent = tEntities[i];
            //            }
            //        }
            //        if (ent != null) {
            //            //update ent health
            //            ent.health = data.health;
            //            if (ent.scoretrackingindex != null && ent.scoretrackingindex != -1) {
            //                ig.global.scores[ent.scoretrackingindex].health = data.health;
            //            }
            //            //console.log("RemoteID: " + ent.remoteId + "  pos: " + data.pos.x + "," + data.pos.y + " ang:" + data.angle + " linVel: " + data.linearVel);

            //            //ent.body.type = Box2D.Dynamics.b2Body.b2staticBody;

            //            //ent.pos.x = data.pos.x;
            //            //ent.pos.y = data.pos.y;
            //            //ent.body.ApplyForce(new Box2D.Common.Math.b2Vec2(data.bodyVel.x, data.bodyVel.x), ent.body.GetPosition());
            //            //ent.body.syncTransform();
            //            //ent.body.type = Box2D.Dynamics.b2Body.b2dynamicBody;

            //            //Client Side Handling:
            //            //1. Set linear velocity.
            //            //2. If position is off, apply impulse towards that position with a small % of power to make a minor adjustmant.
            //            //3. If off by a large amount, just set position.

            //            //**WAS USING THIS
            //            //Stop body OR Set velocity
            //            //ent.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(0, 0));

            //            //**WAS USING THIS
            //            //Set Position
            //            //HAVE TO SCALE FROM THE GET POSITION
            //            //Check distance
            //            entpos = ent.body.GetPosition();

            //            x1 = data.pos.x * Box2D.SCALE;
            //            y1 = data.pos.y * Box2D.SCALE;
            //            x2 = entpos.x;
            //            y2 = entpos.y;
            //            var d = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
            //            //basically, I can tweak this to adjust the velX, velY * 2, where 2 would grow with the more extreme correction based on distance.
            //            if (d >= .32 && d < .64) { //100 pixels per meter, so .01 p/m. This would make it 32 pixels off.
                            
            //                //Directed angle from vector ent to vector data.pos
            //                var angle = Math.atan2(y1, x1) - Math.atan2(y2, x2);
            //                if (angle < 0) { angle += 2 * Math.PI };//Normalize it to 0..2 PI 
                            
            //                //Add vectors to get correction / or Generate velocities
            //                velX = Math.cos(angle) * 2;//2 is the speed of movement here.
            //                velY = Math.sin(angle) * 2;//2 is the speed of movement here.

            //                //console.log("distance Corrected by summed linVel:distance:" + d + "  angRad:" + angle + "  angDeg:" + (angle*180/Math.PI) + " newVec2:" + velX + "," + velY);
            //                ent.body.SetLinearVelocity(new Box2D.Common.Math.b2Vec2(velX, velY), ent.body.GetPosition());
            //                //ent.body.SetLinearVelocity(data.linearVel);
                            
            //            } else if (d >= .64) {
            //                //console.log("distance Corrected by position set:" + d);
            //                ent.body.SetPosition(new Box2D.Common.Math.b2Vec2(data.pos.x * Box2D.SCALE, data.pos.y * Box2D.SCALE));
            //                ent.body.SetLinearVelocity(data.linearVel);
            //            } else {
            //                ent.body.SetLinearVelocity(data.linearVel);
            //            }
                        
                       

            //            //ent.body.ApplyForce(data.linearVel, ent.body.GetPosition());

            //            //Angle Control
            //            //SetTransform(b2Vec2(0,0),body->GetAngle())
            //            //ent.body.GetAngle()
            //            ent.body.SetAngularVelocity(0);
            //            ent.body.SetAngle(data.angle);
            //            //ent.rotateTo(data.angle);
            //            //ent.SetNewAngle(data.angle);

            //            //Update Weapon Angles				    
            //            var wpAngleUpdates = JSON.parse(data.wpangles);
            //            for (wp = 0; wp < wpAngleUpdates.length; wp++) {
            //                ent.hardpoints[wp].weapon.body.SetAngle(wpAngleUpdates[wp]);
            //            }


            //            if (ent.remoteAnim != data.remoteAnim) {

            //                var newAnim = "ent.anims." + data.remoteAnim;
            //                ent.currentAnim = eval(newAnim);
            //                ent.remoteAnim = data.remoteAnim;
            //            }
            //        }
            //    }catch(e){
            //        //entity null
            //       //console.log("caught: "+e);
            //    }
            //});
            //Impulse moves
            this.socket.on('impulse', function (data) {
                try {
                    var ent = ig.game.getEntityByRemoteId(data.remoteId);

                    //THIS->//ent.body.ApplyForce(new Box2D.Common.Math.b2Vec2(data.vel.x, data.vel.y), ent.body.GetPosition());

                    if (ent.remoteAnim != data.remoteAnim) {

                        var newAnim = "ent.anims." + data.remoteAnim;
                        ent.currentAnim = eval(newAnim);

                        ent.currentAnim.flip.x = data.flipped;
                        ent.remoteAnim = data.remoteAnim;
                    }
                } catch (e) {
                    //entity null
                   //console.log("caught: " + e);
                }
            });
            //Objective winner during query
            this.socket.on('objectiveWinner', function (data) {
                //console.log(data);
                
                var team = data.winner;
                
                try {                    
                    var ent = ig.game.getEntityByName(data.objective)
                    ent.addTeamPoints(team);
                    ig.game.gamesocket.writeAnnouncement({ text: "Team " + team + " is taking objective " + ent.name });
                    if (ent.currentTeam != 0) {
                        //Force reset for time display sync
                        ent.setObjTimer(ent.timeCountToControl);
                    }
                } catch (e) {
                    //entity null
                   //console.log("caught: " + e);
                }
               //console.log("Winner for objective :" + data.objective + " " + team);
            });
            //Objective points
            this.socket.on('objectivepoints', function (data) {
			    
                var team = data.team;
                try {
                    var ent = ig.game.objectiveZone;
                    ent.addTeamPoints(team);
                } catch (e) {
                    //entity null
                   //console.log("caught: " + e);
                }
            });
            //update death points for other players
            this.socket.on('scoredeath', function (data) {
                try {
                    var scoreIndex = ig.game.getScoreIndexByRemoteId(data.remoteId);
                    if(scoreIndex != -1){
                        ig.global.scores[scoreIndex].deaths = ig.global.scores[scoreIndex].deaths + 1;
                    }
                } catch (e) {
                    //track errors
                   //console.log("caught: " + e);
                }
            });
            //update assist points for other players
            this.socket.on('scoreassist', function (data) {
                try {
                    var scoreIndex = ig.game.getScoreIndexByRemoteId(data.remoteId);
	                if(scoreIndex != -1){
                        ig.global.scores[scoreIndex].assists = ig.global.scores[scoreIndex].assists + 1;
	                }
                } catch (e) {
                    //track errors
                   //console.log("caught: " + e);
                }
            });
            //score kill points
            this.socket.on('scorekill', function (data) {			    
                try {
                    var scoreIndex = ig.game.getScoreIndexByRemoteId(data.remoteId);
	                if(scoreIndex != -1){
                     ig.global.scores[scoreIndex].kills = ig.global.scores[scoreIndex].kills + 1;
	                }
                } catch (e) {
                    //track errors
                   //console.log("caught: " + e);
                }
            });
            /**
			 * announcing some text to everyone
			 */
            this.socket.on('announced', function(data) {
                ig.game.gamesocket.writeAnnouncement(data);
            });
            /**
             * Write to Chat log
             */
            this.socket.on('chatLobbyRcv', function (data) {
                $('#openChatButton').animo({ animation: 'pulse' });
                ig.game.gamesocket.chatsound1.play();
                //Handle chat log length
                $("#chatlogTable").html("");
                if (ig.global.chat.length > 100) {
                    ig.global.chat.splice(0, 1);
                }
                //write to chat
                ig.global.chat.push(data.msg);
                for (i = 0; i < ig.global.chat.length; i++) {
                    $("#chatlogTable").append(ig.global.chat[i]);
                }                
                $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
            });
            /**
             * Player gets killed, so "kill" Net Player as well
             */
            this.socket.on('killed', function (data) {
               //console.log("kill triggered on Netplayer: " + data.remoteId);
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                var ent = null;
                for (var i in tEntities) {
                    if (tEntities[i].remoteId === data.remoteId) {
                        ent = tEntities[i];
                    }
                }
                if (ent != null) {
                    if (ent.active) {

                        ig.global.scores[ent.scoretrackingindex].health.current = 0;
                        ent.death();
                    }
                }
            });
            /**
             * Player respawned, so respawn netplayer as well
             */
            this.socket.on('netrespawn', function (data) {
                
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                var ent = null;
                for (var i in tEntities) {
                    if (tEntities[i].remoteId === data.remoteId) {
                        ent = tEntities[i];
                    }
                }
                if (ent == null) {
                    
                    //console.log("NET RESPAWN FOR:" + data.playerName + " @ " + JSON.stringify(newClassObj));
                    //Only spawn a new netplayer if needed.
                    var newplayertemp = ig.game.spawnEntity(EntityNetplayer, data.spawnpos.x, data.spawnpos.y, {
                        playerName: data.playerName,
                        hardpoints: data.hardpoints,
                        stealth: data.stealth,
                        optics: data.optics,
                        classType: data.classType,
                        classId: data.classId,
                        density: data.density,

                    });
                    for (var s = 0; s < ig.global.scores.length; s++) {
                        if (ig.global.scores[s].playerName == data.playerName)
                        newplayertemp.scoretrackingindex = s;
                    }
                    
                    //Setup Custom variables
                    newplayertemp.playerName = data.playerName;
                    newplayertemp.remoteId = data.remoteId;
                    newplayertemp.team = data.team;//Just temp to allow FFA.
                }

            });
            /**
             * disconnecting and removing
             */
            this.socket.on('endGame', function (data) {
                ig.game.player.active = false;
                ig.game.hud.endGame(data.winner); 

            });
            this.socket.on('endGameScoreDisplay', function (data) {
                ig.global.finalreportcount++;
                var playerIndex = ig.game.getScoreIndexByRemoteId(data.remoteId);
                if (playerIndex != -1) {
                    ig.global.scores[playerIndex].damageTaken = data.damagetaken;
                    ig.global.scores[playerIndex].objEarned = data.pointscaptured;
                    ig.global.scores[playerIndex].damageSources = data.damageSources;
                    console.log("Damage sources:", data.damageSources);
                    ig.game.gamesocket.updateEndGameScores();
                }  
            });
            /**
			 * disconnecting and removing
			 */
            this.socket.on('disconnect', function() {
                //reconnecting if not wanted to disconnect?
            });
			
            this.socket.on('removed', function(data) {
                try{
                   //console.log("remove triggered on Netplayer: " + data.remoteId);
                    var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                    var ent = null;
                    for (var i in tEntities) {
                        if (tEntities[i].remoteId === data.remoteId) {
                            ent = tEntities[i];
                        }
                    }
                    if (ent != null) {
                        //Remove Netplayer
                        ent.death();
                        //ig.game.removeEntity(ent)
                    }
                    //Remove from scoreboard data
                    var sbfound = -1;
                    for (var t = 0; t < ig.global.scores.length; t++) {
                        if (ig.global.scores[t].playerid == data.remoteId) {
                            sbfound = t;
                            break;
                        }
                    }
                    if (t >= 0) {
                        ig.global.scores.splice(t, 1);
                        ig.game.gamesocket.updatePlayerBoardInformation();
                    }
                }catch(e){
                    //entity null
                   //console.log("catched: "+e);
                }
            });
            /**
             * votekick
             */
            this.socket.on('votekick', function (data) {
                //update vote kick numbers for all players
                ig.global.scores[data.pindex].kickvotes.push(data.remoteId)
                //Update HTML code display
                ig.game.gamesocket.updatePlayerBoardScores();
            });
            /**
             * voteready
             */
            this.socket.on('readyUp', function (data) {
                //Update HTML code display
                var newstatus = !ig.global.scores[data.pindex].ready;
                ig.game.gamesocket.updatePlayerReadyStatus(data.pindex, data.id, newstatus);
            });
            /**
            * voteready
            */
            this.socket.on('updateClientPlayerTeam', function (data) {
                console.log("updateClientPlayerTeam rcv");
                //Update netentity Team if needed
                var tEntities = ig.game.getEntitiesByType(EntityNetplayer);
                var ent = null;
                for (var i in tEntities) {
                    if (tEntities[i].remoteId === data.remoteId) {
                        ent = tEntities[i];
                    }
                }
                if (ent != null) {
                    ent.team = data.team;
                }
                //If local player, update their team status
                if (data.remoteId == ig.game.player.remoteId) {
                    ig.game.player.team = data.team;
                }
                //Make player no longer ready since they changed teams.
                ig.global.scores[data.pindex].ready = false;
                //Update player team
                ig.global.scores[data.pindex].team = data.team;
                //update HTML
                ig.game.gamesocket.updatePlayerTeamStatus(data.pindex, data.team);
                ig.game.gamesocket.updatePlayerReadyStatus(data.pindex, data.id, false);
                ////Update server
                //ig.game.gamesocket.socket.emit('updatePlayerTeam', {
                //    remoteId: data.remoteId,
                //    team: data.team,
                //});
            });
        },
        /**
         * game state sync message
         */
        sendprojectile: function (data) {
            this.socket.emit("sendprojectile", {
                data: data,
                room: ig.global.SocketRoom
            });
        },
        /**
         * game state sync message
         */
        statesync: function (name, data) {
            //console.log("impactconnect, state sync");
            this.socket.emit("playerstateupdate", {
                name: name,
                pid: ig.game.player.remoteId,
                data: data,
                room: ig.global.SocketRoom
            });
        },
		
        /**
		 * universal broadcasting method
		 */
        send: function (name, data) {
            //if (name != 'move') {
            //    console.log("Netsend: " + name);
            //}
            this.socket.emit("impactconnectbroadcasting", {
                name: name,
                data: data,
                room: ig.global.SocketRoom
            });
        },
		
        /**
		 * writes text on every screen
		 * font is your ig.game.font
		 */
        announce: function (data) {
            //console.log("Performing announcement before!", data, ig.global.SocketRoom);
            this.socket.emit("announce", { data: data, room: ig.global.SocketRoom });
            //console.log("Performing announcement after!")
        },
        /**
        *create bullets
        */
        spawnBullet: function (data) {
            //console.log("spawning remote bullet ent", data.ent);
            data.settings.categoryBits = 0x0010;//Net Projectile
            data.settings.maskBits = 0xFFFF && ~0x0008 && ~0x0040 && ~0x0004 && ~0x0010 && ~0x0200;//Does not collside with other projectiles
            var bulletTemp = ig.game.spawnEntity(eval(data.ent), data.x, data.y, data.settings);
            //console.log("fireing remote bullet ent", data.ent);
            bulletTemp.fire(data.angle, data.remoteId, data.team);

            //console.log("soud search remote bullet ent", data.ent);
            //Find weapon sound in database,
            var sound = null;
            for (var wp = 0; wp < ig.game.db.weaponDbArray.length; wp++) {
                if (ig.game.db.weaponDbArray[wp].name == data.wpname) {
                    sound = ig.game.db.weaponDbArray[wp].sound;
                }
            }
            //console.log("sound play remote bullet ent", data.ent);
            //Play sound, based on range
            if (sound != null) {
                var dis = bulletTemp.distanceTo(ig.game.player);
                if (dis >= 1000) { dis = 1000 };
                var vol = (1000 - dis) / 1000;
                sound.play({ volume: Math.round(ig.global.soundMaster.applied * vol) })
            }
        },
        /**
         * //Whenever a new player joins, create the required score and tracking data.
         */
        createPlayerTrackingData: function (data) {
            ig.game.sortEntitiesDeferred();//Resort the entities for Zindex
            //Add them to score array
            ig.global.scores.push({ playerid: data.remoteId, pgid: data.pgid, playerName: data.pName, ishost: data.ishost, playerClassid: data.classid, team: data.team, ready: data.gamestarted, kickvotes: new Array(), damageTaken: 0, shotsfire: 0, objEarned: 0, deaths: 0, kills: 0, assists: 0, damageSources: new Array(), health: { current: 0, max: 0 } });
            //Now, resort the array to put it in order by team
            ig.global.scores.sort(compareTeams);
            ig.game.gamesocket.updatePlayerBoardInformation();

        },
        updatePlayerBoardInformation: function () {
            //Add them to lobby table
            $("#playLobby").html("");
            var htmlheaderlobby = "<div style=\"display:table-row;width:100%;text-align: center;\"><div style=\"display:table-cell;\">Player Name</div><div style=\"display:table-cell;\">Change Team</div><div style=\"display:table-cell;\">Kick</div><div style=\"display:table-cell;\">Votes</div><div style=\"display:table-cell;\">Tank</div><div style=\"display:table-cell;\">Kills</div><div style=\"display:table-cell;\">Deaths</div><div style=\"display:table-cell;\">Assists</div><div style=\"display:table-cell;\">Ready?</div></div>";
            $("#playLobby").append(htmlheaderlobby);

            $("#chatlogplayerlist").html("");
            var playerliststring = "";

            for (var sc = 0; sc < ig.global.scores.length; sc++) {
                var rowClass;
                if (ig.global.scores[sc].team == 1) { rowClass = "lobbyPlayerRowStyleTeam1" };
                if (ig.global.scores[sc].team == 2) { rowClass = "lobbyPlayerRowStyleTeam2" };
                var hosttag = "";
                if (ig.global.scores[sc].ishost) {
                    hosttag = "*HOST*";
                }

                var htmlString = ""
                
                htmlString += "<div id=\"" + ig.global.scores[sc].playerName + "\" class=\"" + rowClass + "\" >";//gameMenuBtn
                htmlString += "<div id=\"lobbyPlayerInfo_" + ig.global.scores[sc].playerName + "\" class=\"lobbyPlayerCell\" ><div id=\"lobbyPlayer_" + ig.global.scores[sc].playerName + "\" style=\"width:96px;\">" + ig.global.scores[sc].playerName + " (" + ig.global.scores[sc].team + ")" + hosttag + "</div></div>";
                htmlString += "<div id=\"lobbyPlayerTeamButton\" class=\"lobbyKickCell\"><div id=\"lobbyPlayerTeamButton_" + ig.global.scores[sc].playerName + "\" class=\"weaponMenubtn\" style=\"width:36px;height:36px;\" pindex=\"" + sc + "\" title=\"Click to Change team\"><img src=\"media/icon_changeteam.png\" id=\"kickbuttonimg\" style=\"height: 32px; width: 32px;display:inline-block;margin-left: 3px;margin-top:3px;\" /></div></div> ";
                htmlString += "<div id=\"lobbyPlayerKickButton\" class=\"lobbyKickCell\"><div id=\"lobbyPlayerKick_" + ig.global.scores[sc].playerName + "\" class=\"weaponMenubtn\" style=\"width:36px;height:36px;\" pindex=\"" + sc + "\"><img src=\"media/icon_kick.png\" id=\"kickbuttonimg\" style=\"height: 32px; width: 32px;display:inline-block;margin-left: 3px;margin-top:3px;\" /></div></div> ";
                htmlString += "<div id=\"lobbyPlayerKickVotes\" class=\"lobbyScoreCell\"><div id=\"lobbyPlayerVotes_" + ig.global.scores[sc].playerName + "\" pindex=\"" + sc + "\" style=\"width:64px;height:64px;\"></div></div>";
                htmlString += "<div id=\"lobbyPlayerChassis\" class=\"lobbyChassisCell\" pindex=\"" + sc + "\"><div style=\"width:64px;height:32px;background: url('media/tankchass_sheet_64.png') 0px " + ((ig.global.scores[sc].playerClassid + 1) * -32) + "px;\">" + ig.game.db.classDbArray[ig.global.scores[sc].playerClassid].classType + "</div></div>";
                htmlString += "<div id=\"lobbyPlayerScores_kills_" + ig.global.scores[sc].playerName + "\" class=\"lobbyScoreCell\" pindex=\"" + sc + "\"><div style=\"width:64px;height:64px;\">0</div></div>";
                htmlString += "<div id=\"lobbyPlayerScores_deaths_" + ig.global.scores[sc].playerName + "\" class=\"lobbyScoreCell\" pindex=\"" + sc + "\"><div style=\"width:64px;height:64px;\">0</div></div>";
                htmlString += "<div id=\"lobbyPlayerScores_assists_" + ig.global.scores[sc].playerName + "\" class=\"lobbyScoreCell\" pindex=\"" + sc + "\"><div style=\"width:64px;height:64px;\">0</div></div>";
                
                //Whats their ready status?
                var rdyClass = "readybuttonNotReady";
                if (ig.global.scores[sc].ready) { rdyClass = "readybuttonIsReady" };
                htmlString += "<div id=\"lobbyPlayerReady_" + ig.global.scores[sc].playerName + "\" class=\"lobbyReadyCell\" pindex=\"" + sc + "\"><span class=\"readybuttonSpan\"><div id=\"lobbyPlayerReadyButton_" + ig.global.scores[sc].playerName + "\" class=\"" + rdyClass + "\" pindex=\"" + sc + "\"></div></span></div>";
                htmlString += "</div>"//## END OF LOBBY ROW
                $("#playLobby").append(htmlString);
                var lobbyWidth = $("#playLobbyParent").innerWidth();
                $("#playLobbyParent").css("left", (window.innerWidth / 2 - lobbyWidth / 2) + "px");

                playerliststring += "<div style='display:table-row;'><div style='display:table-cell;'><div style='line-height: 16px;height: 16px;width: 80px;'>" + ig.global.scores[sc].playerName + "</div></div></div>";
            }

            $("#chatlogplayerlist").html(playerliststring);

            for (var sc = 0; sc < ig.global.scores.length; sc++) {
                $("#lobbyPlayerInfo_" + ig.global.scores[sc].playerName).mouseenter(function () {
                    $("#pstatshoverParent").css("top", $(this).offset().top + "px");
                    $("#pstatshoverParent").css("left", 32 + "px");

                    var pName = ($(this).attr("id").split("_"))[1];
                    console.log("pName lookup:", pName);
                    $.get("/pinfo?name=" + pName, function (pName) {
                        
                    }).done(function (result) {
                        //console.log(result);
                        $("#pstatsWins").html(result.wins);
                        $("#pstatsLoses").html(result.loses);
                        $("#pstatsKicks").html(result.kicks);
                        $("#pstatsLevel").html(result.level);
                    });


                });
                $("#lobbyPlayerInfo_" + ig.global.scores[sc].playerName).mouseleave(function () {
                    $("#pstatshoverParent").css("left", -1000 + "px");
                });
                $("#lobbyPlayerKick_" + ig.global.scores[sc].playerName).click(function () {
                    
                    var pindex = parseInt($(this).attr("pindex"));
                    var id = $(this).attr("id");
                    id = id.split("_");
                   //console.log("Run Kick Vote for " + pindex + " " + id);
                    var kvId = false;
                    for(var kv=0;kv<ig.global.scores[pindex].kickvotes.length;kv++){
                        if (ig.global.scores[pindex].kickvotes[kv] == ig.game.player.remoteId) {
                            kvId = true;
                            break;
                        }
                    }
                    if (kvId) {
                        //Found ID already voted!, Show alert
                    } else {
                        //Not found, so count the vote.
                        ig.global.scores[pindex].kickvotes.push(ig.game.player.remoteId)
                        //Broadcast the update
                        ig.game.gamesocket.send('votekick', {
                            pindex: pindex,
                            remoteId: ig.game.player.remoteId,
                        });
                    }
                    ig.game.gamesocket.updatePlayerBoardScores();
                });
                //Enable click for player to self ready ONLY IF game has not started
                if (!ig.game.startGame) {
                    //console.log("Checking Scoreboard ID for enabling clicks", ig.global.scores[sc].playerid);
                    if (ig.global.scores[sc].playerid == ig.game.player.remoteId) {
                        //console.log("enabling player scoreboard clicks");
                        //Show if player is the game host
                        if (ig.global.playerIsHost) {
                            $("#lobbyPlayer_" + ig.global.scores[sc].playerName).html(ig.global.scores[sc].playerName + " (" + ig.global.scores[sc].team + ")" + " *HOST*");
                        }
                        //Add local player click functions, such as ready and team switch
                        //Ready
                        $("#lobbyPlayerReady_" + ig.global.scores[sc].playerName).click(function () {
                            var pindex = parseInt($(this).attr("pindex"));
                            var id = $(this).attr("id");
                            id = id.split("_");
                            //can only ready, can not unready by choice. This will avoid trolling.
                            if (ig.global.scores[pindex].ready == false) {
                                var newstatus = !ig.global.scores[pindex].ready;
                                ig.game.gamesocket.updatePlayerReadyStatus(pindex, id[1], newstatus);
                                //Broadcast to other players
                                ig.game.gamesocket.send('readyUp', {
                                    pindex: pindex,
                                    id: id[1],
                                });
                            }
                        });
                        //Team switch
                        $("#lobbyPlayerTeamButton_" + ig.global.scores[sc].playerName).click(function () {
                            var pindex = parseInt($(this).attr("pindex"));
                            var team = 0
                            var id = $(this).attr("id");
                            id = id.split("_");
                            //Dont allow team change if already readied up.
                            if (ig.global.scores[pindex].ready == false) {
                                if (ig.global.scores[pindex].team == 1) {
                                    team = 2;

                                } else if (ig.global.scores[pindex].team == 2) {
                                    team = 1;
                                };
                                //Clear ready status
                                ig.global.scores[pindex].ready = false;
                                ig.game.gamesocket.updatePlayerReadyStatus(pindex, id[1], false);
                                //Set local var team
                                //ig.game.player.team = team;
                                //ig.game.gamesocket.updatePlayerTeamStatus(pindex, team);
                                //Broadcast to other players
                                ig.game.gamesocket.socket.emit('updateServerPlayerTeam', {
                                    pindex: pindex,
                                    //team: ig.global.scores[pindex].team,
                                    team: team,
                                    remoteId: ig.global.scores[pindex].playerid,
                                    id: id[1],
                                    room: ig.global.SocketRoom,
                                });
                            }

                        });
                    }
                }
            }

            ig.game.gamesocket.updatePlayerBoardScores();
        },
        updatePlayerTeamStatus: function(pindex, team){
            ig.global.scores[pindex].team = team;
            //Remove old class
           //console.log("Team Change: " + ig.global.scores[pindex].playerName + " " + ig.global.scores[pindex].team);
            $("#" + ig.global.scores[pindex].playerName).removeClass();
            var rowClass;
            if (ig.global.scores[pindex].team == 1) { rowClass = "lobbyPlayerRowStyleTeam1" };
            if (ig.global.scores[pindex].team == 2) { rowClass = "lobbyPlayerRowStyleTeam2" };
            $("#" + ig.global.scores[pindex].playerName).addClass(rowClass);
            //console.log($("#" + ig.global.scores[pindex].playerName).attr("class"));
            if (ig.global.playerIsHost) {
                $("#lobbyPlayer_" + ig.global.scores[pindex].playerName).html(ig.global.scores[pindex].playerName + " (" + ig.global.scores[pindex].team + ")" + " *HOST*");
            } else {
                $("#lobbyPlayer_" + ig.global.scores[pindex].playerName).html(ig.global.scores[pindex].playerName + " (" + ig.global.scores[pindex].team + ")");
            }
        },
        updatePlayerReadyStatus: function (pindex, id, status) {
            ig.global.scores[pindex].ready = status;
            if (ig.global.scores[pindex].ready) {
                removeClass = "readybuttonNotReady";
                addClass = "readybuttonIsReady";
            } else {
                removeClass = "readybuttonIsReady";
                addClass = "readybuttonNotReady";
            }

            $("#lobbyPlayerReadyButton_" + id).removeClass(removeClass);
            $("#lobbyPlayerReadyButton_" + id).addClass(addClass);
            
        },
        updatePlayerBoardScores: function () {
           //console.log("Update Player Board Scores");
            for (var sc = 0; sc < ig.global.scores.length; sc++) {
                var k = ig.global.scores[sc].kills;
                var d = ig.global.scores[sc].deaths;
                var a = ig.global.scores[sc].assists;
                //var scoreString = "K / D / A <br />" + k + "/" +d + "/" + a;//K / D / A <br /> 0 / 0 / 0
               //console.log(ig.global.scores[sc].playerName + " " + k + " " + d + " " + a + " " + ig.global.scores[sc].playerid);
                $(("#lobbyPlayerScores_kills_" + ig.global.scores[sc].playerName)).html("<div style=\"width:64px;height:64px;\">"+k+"</div>");
                $(("#lobbyPlayerScores_deaths_" + ig.global.scores[sc].playerName)).html("<div style=\"width:64px;height:64px;\">" + d + "</div>");
                $(("#lobbyPlayerScores_assists_" + ig.global.scores[sc].playerName)).html("<div style=\"width:64px;height:64px;\">" + a + "</div>");

                var kvId = false;
                var voteString = "";
                for (var kv = 0; kv < ig.global.scores[sc].kickvotes.length; kv++) {
                    if (ig.global.scores[sc].kickvotes[kv] == ig.game.player.remoteId) {
                        kvId = true;
                        break;


                    }
                }
                if (kvId) {
                    //Found ID already voted!, Edit to Show already voted
                    voteString = "<br>";
                } else {
                    //Not found, Just show current votes
                }

                $("#lobbyPlayerVotes_" + ig.global.scores[sc].playerName).html(voteString + " " + ig.global.scores[sc].kickvotes.length);

                if (ig.global.scores[sc].playerid == ig.game.player.remoteId) {
                        //Check Current Votes for a kick condition on current local player
                        //if (ig.global.scores[sc].kickvotes.length > ig.global.scores.length / 2) { //More than half required to kick
                    if (ig.global.scores[sc].kickvotes.length > Math.ceil(ig.global.scores[sc].length / 2)) {
                        $("#KickedAlert").css("top", "100px");
                        $("#KickedAlert").css("left", (window.innerWidth / 2 - 128) + "px");

                        //Move Scoreboard
                        $("#playLobbyParent").css("top", "-1000px");
                        //Move other DIVS
                        $("#scoreblipsparent").css("top", (-1000) + "px");
                        $("#chatparent").css("bottom", "1000px");
                        $("#optMenuIngameOpen").css("top", -1000 + "px");

                        //Disconnect and remove from game.
                        ig.game.gamesocket.socket.emit('kickplayer', { remoteId: ig.global.scores[sc].playerid });
                        ig.global.started = false;
                        ig.global.scores.length = 0;
                        ig.global.wasKicked = true;
                        ig.system.setGame(MyGame);
                        //post('../hardpoint/index-desktop.html', { alert: 'kicked' });
                    }

                }
            }
        },
        updateEndGameScores: function () {
            var finalString = "<div style=\"display:table-row;\"><div style=\"display:table-cell;\">Player Name</div><div style=\"display:table-cell;\">Kills</div><div style=\"display:table-cell;\">Deaths</div><div style=\"display:table-cell;\">Assists</div><div style=\"display:table-cell;\">Damage Given</div><div style=\"display:table-cell;\">Damage Received</div><div style=\"display:table-cell;\">Capture Points</div></div>";
            var scoresArrObject = new Array();
            for (var sc = 0; sc < ig.global.scores.length; sc++) {
                var name = ig.global.scores[sc].playerName;
                var k = ig.global.scores[sc].kills;
                var d = ig.global.scores[sc].deaths;
                var a = ig.global.scores[sc].assists;
                //Will need more complicated calcs for the player damage dealt.
                var dd = 0;
                for (var dc = 0; dc < ig.global.scores.length; dc++) {

                    for (var ds = 0; ds < ig.global.scores[dc].damageSources.length; ds++) {
                        var rId = ig.global.scores[dc].damageSources[ds].remoteId;
                        //console.log("RID of Data sources:" + rId + ", for score pId :" + ig.global.scores[sc].playerid);
                        if (ig.global.scores[sc].playerid == rId) {
                            dd = dd + ig.global.scores[dc].damageSources[ds].damage;
                        }
                        //var ddIndex = ig.game.getScoreIndexByRemoteId(rId);
                        //if (ddIndex != -1) {

                        //}
                    }

                }
                
                dd = Math.round(dd);

                var dr = Math.round(ig.global.scores[sc].damageTaken);
                var caps = ig.global.scores[sc].objEarned;

                var teamClass;
                if (ig.global.scores[sc].team == 1) { teamClass = "endGameRowStyleTeam1" };
                if (ig.global.scores[sc].team == 2) { teamClass = "endGameRowStyleTeam2" };

                var htmlString = "<div class=\"" + teamClass + "\"><div style=\"display:table-cell;\">" + name + "</div><div style=\"display:table-cell;\">" + k + "</div><div style=\"display:table-cell;\">" + d + "</div><div style=\"display:table-cell;\">" + a + "</div><div style=\"display:table-cell;\">" + dd + "</div><div style=\"display:table-cell;\">" + dr + "</div><div style=\"display:table-cell;\">" + caps + "</div></div>";
                finalString += htmlString;
                scoresArrObject.push({
                    name: name,
                    pgid: ig.global.scores[sc].pgid,
                    kills: k,
                    deaths: d,
                    assists: a,
                    given: dd,
                    received: dr,
                    caps: caps,
                    team: ig.global.scores[sc].team
                });
            }
            $("#egTable").html(finalString);
            return scoresArrObject;
        },
        writeAnnouncement: function (data) {
            if (ig.global.announcement.length > 5) {
                ig.global.announcement.splice(0, 1);
            }
            ig.global.announcement.push(data.text);
            //Setup delayed comsume for showing on draw/update cycle?
            //console.log("Run announcement", data);
            for (c = 0; c < ig.global.announcement.length; c++) {
                ig.game.writenote(ig.global.announcement[c], {
                    x: 16,
                    y: 78 + (6 * c)
                });
            }
            $("#chatlogTable").html("");
            if (ig.global.chat.length > 100) {
                ig.global.chat.splice(0, 1);
            }
            //write to chat
            ig.global.chat.push("<div style=\"display:table-row;width:100%;\"><div style=\"color:#0099FF;\">" + data.text + "</div></div>");
            for (i = 0; i < ig.global.chat.length; i++) {
                $("#chatlogTable").append(ig.global.chat[i]);
            }
            $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
        },
		
	});
});

function compareTeams(a, b) {
    if (a.team < b.team)
        return -1;
    if (a.team > b.team)
        return 1;
    return 0;
}