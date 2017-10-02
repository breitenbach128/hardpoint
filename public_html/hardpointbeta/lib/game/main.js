ig.module( 
	'game.main' 
)
.requires(
	'impact.game',
	'impact.font',
	'game.weapon',
    'game.projectile',
    'game.play',
    'game.playerselect',
    'game.databases',
    'game.hardpoint',
	'game.ability',
	'game.entities.ainode',
    'game.entities.pointer',
    'game.entities.pointerBox2d',
    'game.entities.objective',
    'game.entities.booster',
	'game.entities.bot',
	'game.entities.botarmor',
	'game.entities.botweapon',
	'game.entities.beacon',
    'game.entities.powerup',
    'game.entities.waypoint',
	'game.entities.player',
    'game.entities.armor',
    'game.entities.netplayer',
    'game.entities.netweapon',
    'game.entities.netarmor',
	'game.entities.destructable',
    'game.entities.barrel',
	'game.entities.flag',
    'game.entities.hud',
    'game.entities.particle',
    'game.entities.placement',
    'game.entities.turret',
    'game.entities.gametrigger',
    'game.entities.spawnzone',
    'game.entities.eyecandy',
    'game.entities.water',
	'game.levels.abandondedfort',
	'game.levels.arenaofdeath',
	'game.levels.wasteland1',
    'game.levels.titlelevel',
    'game.levels.bloodandoil',
    'game.levels.mountainpass',
    'plugins.astar-for-entities',
	'plugins.box2d.game',
    'plugins.button',
    'plugins.font2',
    'plugins.fog',
    'plugins.frametimer',
    'plugins.canvastext',
    'plugins.impact-tween.tween',
    'plugins.impactconnect',
	'plugins.notification-manager',
    'plugins.impact-storage'
)
.defines(function(){
    //ig.System.inject({
    //    clear: function (color) {
    //        this.canvas.width = this.canvas.width;
    //    }
    //});
MyGame = ig.Box2DGame.extend({//The menu level needs to just be a Game, not Box2DGame, unless I create the world. I can either make a level, or make it a regular game.
	
	gravity: 100, // All entities are affected by this
	//Hex codes for MASK and Targets for collision
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
	// Load a font
	font: new ig.Font('media/04b03.font.png', { borderColor: '#000', borderSize: 1 }),
	font10yellowbrown: new ig.Font('media/fonts/visitor_s10_yellowbrown.font.png', { borderColor: '#000', borderSize: 1 }),
	clearColor: '#000000',
	//Game Variables
	currentRoomListing: [],
	socket: null,
	connectionError: false,
    pageTransition: false,
    socketid: 0,
    updatedOnlineName: false,
	init: function () {
	    //Global Configs
	    ig.setNocache(true);
		//Setup Storage
		this.gameStorage =  new ig.Storage();
	    //sounds
	    this.chatsound1 = soundManager.createSound({ id: 'sound_chatsound1', url: './media/sounds/TinyButtonPush.mp3', volume: 100 });
	    //setup globals
		ig.global.COL_ALL= 0xFFFF;
		ig.global.COL_NONE= 0x0000;
		ig.global.COL_PLAYER= 0x0002;        
		ig.global.COL_NETPLAYER= 0x0004;
		ig.global.COL_BULLET_LOCAL= 0x0008;
		ig.global.COL_BULLET_NET= 0x0010;
		ig.global.COL_PLAYER_ARMOR= 0x0020;
		ig.global.COL_PLAYER_WEAPON= 0x0040;
		ig.global.COL_NETPLAYER_WEAPON= 0x0080;
		ig.global.COL_NETPLAYER_ARMOR= 0x0200;
		ig.global.COL_BOT_ARMOR= 0x0400;
		ig.global.COL_BOT_WEAPON= 0x0800;
		ig.global.COL_BOT= 0x1000;
		ig.global.GRP_PLAYER= 9;
		ig.global.GRP_NETPLAYER= 8;
		ig.global.GRP_BOT= 5;

	    ig.global.gameversion = 'beta2.2016.7.18.1615';
	    ig.global.playerName = "newbie";
	    ig.global.playerIsHost = false,
        ig.global.finalreportcount = 0;
	    ig.global.class = -1;
	    ig.global.started = false;
	    ig.global.screenElements = new ig.Image('media/screenelements1.png');
	    ig.global.dataimage = ig.global.screenElements.data;
	    ig.global.playerlisting = [];
	    ig.global.onlinecount = 0;
	    ig.global.SocketRoom = -1;
	    ig.global.matchId = -1;
	    ig.global.SelectedLevel = 0;
	    ig.global.chat = new Array();
	    ig.global.announcement = new Array();
	    ig.global.chatIndex = 0;
	    ig.global.chatcount = 0;
	    ig.global.perks = new Array();
	    ig.global.auth = { remoteId: 0, ssec: 0 },
        ig.global.gamesizelimit = 10;
	    //ig.global.connectUrl = "http://localhost:1337";
        ig.global.connectUrl = "http://game-128ghardpoint.rhcloud.com:8000";
	    //Global options:
	    ig.global.soundMaster = { current: 50, applied: 50 };
	    ig.global.musicMaster = { current: 50, applied: 50 };
	    ig.global.radarLocation = { current: 32, applied: 32 };
	    ig.global.particleCount = { current: 3, applied: 3 };
	    ig.global.tipsEnabled = { current: true, applied: true };
	    ig.global.login = { id: 0, alias: 'newbie' };
	    ig.global.mhistory = { data: null, retrieved: false, currentclicked: -1, element: null };
	    ig.global.friends = [];
	    ig.global.currentTip = 0;
	    ig.global.tips = [{ triggered: false, imgsrc: 'media/tips/playtstats.PNG', text: 'The HUD displays some basic information on your weapons, such as reload status, ammo remaining before reload, armor status (red bar shows direction), and finally, your ability ready status.' },
	    { triggered: false, imgsrc: 'media/tips/objectivepoints.PNG', text: 'Taking objective points is how you win the game! Find the objectives and hold them to take control and earn points. The first to the set point limit wins!' },
	    { triggered: false, imgsrc: 'media/tips/tutorial_driving.png', text: 'Basic Controls: Driving. Move your tank around with W,A,S,D. Different tanks move and turn at different rates.' },
	    { triggered: false, imgsrc: 'media/tips/tutorial_aimming.png', text: 'Basic Controls: Aim and Fire. Weapons are fired with Mouse1 and Mouse2. Simply hold down the mouse button to make your weapon aim at the mouse. Some weapons rotate faster than others.' },
	    { triggered: false, imgsrc: 'media/tips/weapongroups.png', text: 'Weapon Groups: Weapons are organized into groups, and these groups are controlled by mouse 1 or mouse 2. Normally, the central turret is mouse 1.' },
	    { triggered: false, imgsrc: 'media/tips/tutorial_fullscreen.png', text: 'Full Screen Mode: Press your F11 key to toggle FULLSCREEN mode for a better gameplay experience!' },
	    { triggered: false, imgsrc: 'media/tips/selecttankchassis.PNG', text: 'Select your tank chassis. Your tank chassis determines your basic stats, as well as your amount and location of hardpoints.' },
	    { triggered: false, imgsrc: 'media/tips/perks.png', text: 'Perks give small bonuses to your tank. Just drag and drop up to three different perks. Use them to offset a weakness, or make an advantage even bigger' }, ];

	    //
	    $.get('/profile', function () {
            //Display loading profile graphic
	    }).done(function (result) {
	        //Stop loading profile graphics and display stats.
            //Return to signin if no auth exists
	        if (result == undefined || result == null || result.pid == undefined) {window.location.replace('http://game-128ghardpoint.rhcloud.com/signin.html') };
	        ig.global.login.id = result.pid
	        ig.global.login.alias = result.name;
	        ig.global.playerName = result.name;	        

	        //console.log("UserAuthed: ", result, Date.now());
	        var winratio = 0;
	        if (result.loses == 0) {
	            winratio = result.wins;
	        } else if (result.wins == 0) {
	            winratio = 0;
	        } else {
	            winratio = (result.wins / result.loses)
	        }

	        //winratio = winratio * 1500 + result.matches.length + result.totaldamgiven + result.totaldamrcv;
	        $("#profilenickname").html(result.name);
	        $('#playernamebox').val(result.name);	        
	        $("#profileKills").html(result.careerkills);
	        $("#profileDeaths").html(result.careerdeaths);
	        $("#profileAssists").html(result.careerassists);
	        $("#profileRatio").html((result.careerkills / result.careerdeaths));
	        $("#profileDamDone").html(result.totaldamgiven); 
	        $("#profileDamRcvd").html(result.totaldamrcv);
	        $("#profileCaps").html(result.caps);
	        $("#profileWins").html(result.wins);
	        $("#profileLosses").html(result.loses);
	        $("#profileDisconnects").html(result.disconnects);
	        $("#profileGamesPlayed").html(result.matches.length);
	        $("#profileKicks").html(result.kicks);
	        //XP and Level // level = constant * sqrt(XP)
	        var level = Math.sqrt(200 * ((2 * (result.xp)) + 0) + 0) / 200;
	        level = Math.round(level);
	        var nextLevelReqExp = ((((Math.pow(200 * (level+1), 2)) - 0) / 200) - 0) / 2;;

	        $("#xpnum").html("Level:" + level + " : " + (result.xp) + "/" + nextLevelReqExp);
	        console.log(Math.round(((result.xp) / nextLevelReqExp) * 300));
	        $("#xpbar").css("width", Math.round(((result.xp) / nextLevelReqExp) * 300)) + "px";
            var matchHtml = ""
            for (var h = 0; h < result.matches.length;h++){
	            matchHtml += "<div style=\"display:table-row;\"><div style=\"display:table-cell\"><span style=\"bordcrgameer: solid #DDDDDD 1px; width: 100%; \">"+result.matches[h]+"</span></div></div>"
	        }
            $("#matchhistorytable").html(matchHtml);
	        //Friends
            ig.game.updateFriendList(result.friends);

            if (result.matches.length == 0 && !(localStorage.newplayercheck)) {
                //No matches played, so ask to update name.
                //$("#userProfileDisplayParent").css("top", "40px");
                $("#playerNameParent").css("top", "120px");
                $("#playerNameAlert").html("Welcome to Hardpoint: Please provide an ingame name.");
            } else {
                $("#playerNameAlert").html("Welcome Back! Would you like to update your ingame name?");
            }
            //Check Reconnection Status once auth is succceded
            ig.game.checkReconnectStatus(ig.global.login.id)
            localStorage.setItem("newplayercheck", true);

            ig.global.pstats = {
                w: result.wins,
                l: result.loses,
                k: result.kicks,
                lvl: level
                }
	    });
	    //console.log("main being initalized");
	    //for (var key in ig.global) {
	    //    var value = ig.global[key];
	    //   //console.log("Global:" + value);
	    //}
	    $("#notificationButton").css("top", 40 + "px");
	    $("#chassisTemplateParent").css("top", "-1000px");
	    $("#crgamebutton").click(function () {
	        //Move create game menu on screen
	        $("#CreditsScreen").css("top", (window.innerHeight*(1/12))+"px");
	    })
	    $("#CreditsScreenCloseBtn").click(function () {
	        //Move create game menu on screen
	        $("#CreditsScreen").css("top", "-1000px");
	    })
	    
	    //Setup Menu Click Events
	    $("#cgamebutton").click(function () {
	        //Move create game menu on screen
	        $("#createGameParent").css("top", "48px");
	    });
	    $("#jgamebutton").click(function () {
	        //Move join game menu on screen
	        $("#GameBrowserParent").css("top", "48px");
	    });
	    
	    $("#exitGameBrowser").click(function () {
	        //Leaves the join game screen back to the main menu
	        $("#GameBrowserParent").css("top", "-1000px");
	    });
	    $("#backcreategame").click(function () {
	        //Leaves the create game screen back to the main menu
	        $("#createGameParent").css("top", "-1000px");
	    });
	    //Update Profile Name Button
        
	    $("#profileupdatenameButton").click(function () {
	        $("#playerNameParent").css("top", "120px");
	    })
        
        //Leaderboard Click actions       
        $("#lbtoggle").click(function () {
	        $("#leaderboard").css("left", (window.innerWidth*(1/2) - 510 )+"px");
            //Populate leadboard within initial data
            $("#lbqueryvals").val("xp");
            var reqType = $( "#lbqueryvals option:selected" ).val();
            $("#lbcontent").html("");
            $.get( "/leaderboard", { reqtype: reqType} ).done(function (result) {
                var htmlToAdd = "";
                var cl="lbrow";
                
                for(var i=0;i < result.length;i++){
                    if(i % 2 != 0){cl = "lbrowalt"}else{cl = "lbrow"};
                    htmlToAdd +='<div style="display:table-row;" class="'+cl+'"> ' +
                        '<div style="display:table-cell;width:460px;border-bottom: 1px solid #888888;">'+
                            '<div style="line-height: 20px;height: 20px;">'+ result[i].name+'</div>'+
                        '</div>'+
                        '<div style="display:table-cell;border-bottom: 1px solid #888888;">'+
                            '<div style="line-height: 20px;height: 20px;">'+ result[i].data+'</div>'+
                        '</div>'+
                    '</div>';                    
                }
                $("#lbcontent").html(htmlToAdd);
            });
            
	    })
        $("#close_leaderboard").click(function () {
	        $("#leaderboard").css("left", (-3000 )+"px");
	    })
        //Leaderboard Value Change
        $("#lbqueryvals").change(function() {
            var reqType = $( "#lbqueryvals option:selected" ).val();
            $("#lbcontent").html("");
            $.get( "/leaderboard", { reqtype: reqType} ).done(function (result) {
                var htmlToAdd = "";
                var cl="lbrow";
                
                for(var i=0;i < result.length;i++){
                    if(i % 2 != 0){cl = "lbrowalt"}else{cl = "lbrow"};
                    htmlToAdd +='<div style="display:table-row;" class="'+cl+'"> ' +
                        '<div style="display:table-cell;width:460px;border-bottom: 1px solid #888888;">'+
                            '<div style="line-height: 20px;height: 20px;">'+ result[i].name+'</div>'+
                        '</div>'+
                        '<div style="display:table-cell;border-bottom: 1px solid #888888;">'+
                            '<div style="line-height: 20px;height: 20px;">'+ result[i].data+'</div>'+
                        '</div>'+
                    '</div>';                    
                }
                $("#lbcontent").html(htmlToAdd);
            });
        });
        
        
        //Select Name click actions
	    $("#selectName").click(function () {
	        if (ig.global.login.id != 0) {
	            $('#playernamebox').val($('#playernamebox').val().toUpperCase());
	            var inputVal = $('#playernamebox').val();
	            var characterReg = /^[a-zA-Z0-9.-]+$/;///^\s*[a-zA-Z0-9,\s]+\s*$/;
	            if (!characterReg.test(inputVal)) {
	                $('#badnamewarning').html('<span">No special characters or spaces allowed.</span>');
	            } else {

	                if (typeof io !== 'undefined' && ig.game.socket != undefined) {
	                    ig.game.socket.emit('updateProfileName', {
	                        pgid: ig.global.login.id,
	                        newname: $('#playernamebox').val(),
	                        oldname: ig.global.login.alias
	                    });
	                }

	            };
	        }
	    });
	    $("#closeName").click(function () {
	        $("#playerNameParent").css("top", "-1000px");
	    });
	    //Update level listing and setup level selection for create game
	    var levellistingHtmlContent = "";
	    for (l = 0; l < ig.global.levels.length; l++) {
	        levellistingHtmlContent += "<option value=" + l + ">" + ig.global.levels[l].name + "</option>";
	    }
	    //Initial Values
	    $("#gamemap").attr("src", ig.global.levels[0].imgsrc);
	    $("#leveldescription").html(ig.global.levels[0].desc);

	    //Setup level buttons
	    //Make DIVs and Click Events
	    var levelhtmlInsert = "";
	    $("#gamelistingbuttons").html("");
	    for (var r = 0; r < ig.global.levels.length; r++) {

	        //finalString += "</ div>";
	        var levelId = "level" + r;
	        levelhtmlInsert = "<DIV id='" + levelId + "' class=\"gameMenuBtn\" + lvlIndex='" + r + "' >" + ig.global.levels[r].name + "</div>";
	        $("#gamelistingbuttons").append(levelhtmlInsert);
	        $("#"+levelId).click(function () {
	                var indexselected = parseInt($(this).attr("lvlIndex"));
	               //console.log("New Level Selected! " + indexselected);
	                ig.global.SelectedLevel = indexselected;
	                $("#gamemap").attr("src", ig.global.levels[indexselected].imgsrc);
	                $("#leveldescription").html(ig.global.levels[indexselected].desc);
	        })
	    }
	    $("#gamenamebox").on("input", function (e) {
	        var inputVal = $('#gamenamebox').val();
	        var characterReg = /^\s*[a-zA-Z0-9,\s]+\s*$/;
	        if (!characterReg.test(inputVal)) {
	            $("#nogamenamewarning").css("background-color", "red");
	            $("#nogamenamewarning").html("YOUR GAME NAME HAS ILLEGAL CHARACTERS!");
	        } else {
	            $("#nogamenamewarning").css("");
	            $("#nogamenamewarning").html("");
	            ig.game.updateGamelistData();
	            var roomNameAllowed = true;
	            if (ig.game.currentRoomListing != null && ig.game.currentRoomListing != undefined) {
	                for (var cr = 0; cr < ig.game.currentRoomListing.length; cr++) {
	                    if ($(this).val() == ig.game.currentRoomListing[cr].roomId) {
	                        roomNameAllowed = false;
	                    }
	                }
	            }
	            if (roomNameAllowed) {
	                ig.global.SocketRoom = $(this).val();
	            } else {
	                ig.global.SocketRoom = -1;
	            }
	        }
	    });
        //Only allow create room button if name is available.
	    $("#newcreateGame").click(function () {
	        if (ig.global.SocketRoom != -1 && ig.global.SocketRoom != "") {
	            //It has a text value, so allow create
	            if (ig.global.started == false) {
	                themesound.stop();
	                //console.log("Create New Game by " + ig.global.playerName);
	                ig.game.socket.emit('connectToLobby', {});
	                ig.global.playerIsHost = true;
	                ig.game.pageTransition = true;
	                //Set loading screen position
	                randomQuote();
                    $("#loadingscreen").css({
                        left: "0px"
                    });
	                ig.system.setGame(SelectPlayer);
	                ig.global.started = true;
	                $("#createGameParent").css("top", "-1000px");
	                $("#mainmenu").css("top", "-1000px");
	                
	            }
	        } else {
	            $("#nogamenamewarning").css("background-color", "red");
	            $("#nogamenamewarning").html("YOUR GAME NEEDS A UNIQUE NAME!");
	        }
	    });

	    //Connect via socket IO and setup listeners
	    if (typeof io !== 'undefined') {
	        this.socket = io.connect(ig.global.connectUrl, {
	            'reconnect': false,
	            'reconnection delay': 0,
	            'max reconnection attempts': 0,
	            'forceNew': true,
                'force new connection': true,
	            //'reconnect': true,
	            //'reconnection delay': 500,
	            //'max reconnection attempts': 10,
	            //'timeout ': 5000,
	        });
	        this.socket.on('setSocketId', function (data) {
	            ig.game.socketid = data.id;
	        });
	        //Join Main Lobby for Chat
	        this.socket.emit('chatLobbyJoin', {});
	        //Ask for match listing data to generate match list.
	        if (ig.global.login.id != 0) {
	            ig.global.mhistory.retrieved = true;
	            this.socket.emit('getMatchHistory', { pid: ig.global.login.id });
	        }
	        //match history Receiver	        
	        this.socket.on('clientMatchHistory', function (data) {
	            //mName,mId,mWinner,mData
	            ig.global.mhistory.data = data;
	            $("#matchhistorytable").html("");
	            for (var x = 0; x < data.length; x++) {
	                //get player data
	                var f = -1;
	                for (var p = 0; p < data[x].mData.length; p++) {
	                    if (data[x].mData[p].pgid == ig.global.login.id) {
	                        f = p;
	                    }
	                }
	                if (f != -1) {
	                    //create html
	                    var matchrowclass = "matchRowDC";
	                    if (data[x].mWinner == data[x].mData[f].team) {
	                        matchrowclass = "matchRowWin";
	                    } else if (data[x].mWinner != data[x].mData[f].team && data[x].mWinner != 0) {
	                        matchrowclass = "matchRowLose";
	                    }
	                    var htmlContent = "<div id=\"match_" + x + "\" mnum=\""+ x +"\" class=" + matchrowclass + "><div style=\"display: table-cell;\">" + data[x].mName + "</div></div>";
	                    $("#matchhistorytable").append(htmlContent);
	                    $("#match_" + x).click(function () {
	                        var matchIndex = parseInt($(this).attr("mnum"));
	                        //Add click feature
	                        
                            //if element is not null, remove it first.
	                        if (ig.global.mhistory.currentclicked != -1) {
	                            //Remove the old DIV contents
	                            $("#matchcontent_" + ig.global.mhistory.currentclicked).html("");
	                            ig.global.mhistory.element.remove();
	                        }
                            //Then, attach the new content
	                        if (ig.global.mhistory.currentclicked != matchIndex) {

	                            ig.global.mhistory.currentclicked = matchIndex;

	                            //Update the new div contents with the match stats
	                            $contentArea = "<div class=\"matchcontentrow\"><div class=\"matchcontentarea\" id=\"" + "matchcontent_" + matchIndex + "\"></div></div>";
	                            $(this).after($contentArea);
	                            ig.global.mhistory.element = $("#matchcontent_" + matchIndex)[0];
	                            //$("#matchcontent_" + matchIndex).append("<div class=\"matchcontentrow\"><div class=\"matchcontentcell\">" + "Player Name" + "</div></div>");
	                            //Header string
	                            var matchContentHeader = "<div class=\"matchcontentrow\"><div class=\"matchcontentcell\">Name</div><div class=\"matchcontentcell\">K</div><div class=\"matchcontentcell\">D</div><div class=\"matchcontentcell\">A</div><div class=\"matchcontentcell\">Obj</div><div class=\"matchcontentcell\">Off</div><div class=\"matchcontentcell\">Def</div><div class=\"matchcontentcell\">Team</div></div>";
	                            $("#matchcontent_" + matchIndex).append(matchContentHeader);
	                            for (var p = 0; p < ig.global.mhistory.data[matchIndex].mData.length; p++) {

	                                var mcontentrowclass = 'matchcontentrow';
	                                var mcontentcellclass = 'matchcontentcell';
	                                if (ig.global.mhistory.data[matchIndex].mData[p].pgid == ig.global.login.id) {
	                                    mcontentcellclass = 'matchcontentcellSelfPlayer';
	                                }
	                                if (ig.global.mhistory.data[matchIndex].mData[p].team == 1) {
	                                    mcontentrowclass = 'matchcontentrowteam1';
	                                } else if (ig.global.mhistory.data[matchIndex].mData[p].team == 2) {
	                                    mcontentrowclass = 'matchcontentrowteam2';
	                                }
	                                var matchContentString = "<div class=\"" + mcontentrowclass + "\"><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].name;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].kills;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].deaths;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].assists;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].caps;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].given;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].received;
	                                matchContentString += "</div><div class=\"" + mcontentcellclass + "\">" + ig.global.mhistory.data[matchIndex].mData[p].team;
	                                matchContentString += "</div></div></div></div></div></div></div></div>";
	                                $("#matchcontent_" + matchIndex).append(matchContentString);
	                            }
	                        } else {
	                            ig.global.mhistory.currentclicked = -1;
	                        }

	                    });
	                }
	            }
	           

	        });
	        //Friend Search/Add Button
	        $("#friendsearchbutton").click(function () {
	            $('#friendsearchinput').val($('#friendsearchinput').val().toUpperCase());
	            var searchName = $("#friendsearchinput").val();
	            if (searchName != "" && searchName != null) {
	                ig.game.socket.emit('friendrequest', { name: searchName, requestor: ig.global.playerName });
	            }
	        });
	        this.socket.on('friendsearchError', function () {
	            if ($("#frienderrors").attr("error") == "false") {
	                $("#frienderrors").attr("error", 'true');
	                $("#frienderrors").html("ERROR: NO FRIEND FOUND")
	            }
	        });
	        this.socket.on('friendslistchange', function () {
	            console.log("Your friends list changed! Emit an update request");
	            ig.game.socket.emit('friendlistrequest', {name:ig.global.playerName});
	        });
	        this.socket.on('newfriendslist', function (data) {
	            //console.log("Received new friends list from last request", data);
	            ig.game.updateFriendList(data.friendslist);
	        });

	        //Chat box sender click
	        $("#sendChatButton").click(function () {
	            if (ig.global.chatcount < 5) {
	                ig.global.chatcount++;
	                var characterReg = /^\s*[a-zA-Z0-9.!?/@#$%-,\s]+\s*$/;//^[a-zA-Z0-9.-]+$
	                if (!characterReg.test($("#chatarea").val())) {
	                    $('#chatparent').before('<span">Only certain special characters allowed.</span>');
	                } else {
	                    ig.game.socket.emit('chatLobbySend', { id: ig.game.socketid, alias: ig.global.login.alias, msg: $("#chatarea").val() });
	                }
	                $("#chatarea").val("");
	            } else {
	                $warning = "<div style=\"display:table-row;width:100%;\"><div style=\"color:#44FFFF;\">SPAM FILTER ACTIVE</div></div>";
	                $("#chatlogTable").append($warning);
	                $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
	                //$('#chatparent').before('<span">SPAM FILTER ACTIVE: PLEASE WAIT BEFORE NEXT MESSAGE!</span>');
	            }
	        });
	        //Chat Receiver	        
	        this.socket.on('chatLobbyRcv', function (data) {
	            $('#openChatButton').animo({ animation: 'pulse' });
	            ig.game.chatsound1.play();

                //Modify string to have new lines

	            //write to chat
	            $("#chatlogTable").append(data.msg);
	            $('#chatLog').scrollTop($('#chatLog')[0].scrollHeight);
	        });
            //Handle Client connection events
	        this.socket.on('connect_error', function (errObj) {
	            console.log("Connection Attempt Error", errObj);

	        });
	        this.socket.on('disconnect', function () {
	            console.log("Client disconnect");
	            if (this.pageTransition == false) {
	                $("#serverConnectionNotice").css("top", "100px");
	            }
	        });
	        this.socket.on('error', function () {
	            console.log("Client error");
	            $("#serverConnectionNotice").css("top", "100px");
	        });
	        this.socket.on('reconnect', function () {
	            console.log("Client reconnect");
	            //$("#serverConnectionNotice").css("top", "-1000px");
	        });
	        this.socket.on('reconnecting', function () {
	            console.log("Client Reconnecting");
	        });
	        this.socket.on('reconnect_attempt', function () {
	            console.log("Client reconnect_attempt");
	        });
            //Name update confirmation
	        this.socket.on('profilenameupdateStatusResponse', function (data) {
	            console.log('profileUpdate response', data);
	            if (data.namestatus == 'succeeded') {
	                //If good, then update local information and close menu
	                
	                $('#currentName').html("Current Name:   " + $('#playernamebox').val());
	                $("#profilenickname").html($('#playernamebox').val());
	                $("#playerNameParent").css("top", "-1000px");
	                ig.global.playerName = $('#playernamebox').val();
	                ig.global.login.alias = $('#playernamebox').val();
	                $('#badnamewarning').html('');
	            } else {
	                //If bad, then update alert warning and wait for new name attempt
	                $('#badnamewarning').html('Name is not unique!');
	            }

	        });
	        //Handle Player Manual Reconnect Event
	        this.socket.on('enableReconnectByClient', function (data) {
	            if (ig.game.gameStorage.isSet('lastMatchName') == true) {
	                var lastMatch = ig.game.gameStorage.get('lastMatchName');
	                if (data.roomName != lastMatch.matchname) {
                        $("#reconnectYes").removeClass("gameMenuBtnDisabled");
	                    $("#reconnectYes").addClass("gameMenuBtn");
	                    console.log("enablingOfReconnectRcv:", data);
	                    $("#reconnectGameName").html(data.roomName);
	                    $("#reconnectGameCount").html(data.roomCount + "/" + ig.global.gamesizelimit);
	                    $("#reconnectWarningParent").css("top", "128px");
	                    $("#reconnectYes").click(function () {
	                        //Emit Request to receive server player information, once that request is received, set globals and connect to game.
	                        
	                        ig.game.socket.emit('reconnectByPlayer', { pgid: ig.global.login.id });
	                    });
	                }
	            }

	        });
	        this.socket.on('authorizedReconnect', function (data) {
                //Clear up screen
	            $("#reconnectWarningParent").css("top", "-1000px");	           
	            $("#GameBrowserParent").css("top", "-1000px");
	            $("#joinGameButton").css("top", "-1000px");
	            $("#mainmenu").css("top", "-1000px");
	            $("#profileButton").css("top", -500 + "px");
                //get server data
	            console.log("Client authorized for reconnect with the following data.", data);
                //get local data
	            //var gameInfo = ig.game.gameStorage.get('gameinfo');
                
                //Set Required globals
	            ig.global.started = true;
	            ig.global.class = JSON.parse(data.gamedata.pClass);
	            ig.global.playerName = data.gamedata.pName;
	            ig.global.SocketRoom = data.gamedata.room;
	            ig.global.SelectedLevel = data.gamedata.levelId;
	            ig.global.perks = data.gamedata.pPerks; //This needs to be moved to the player array on server.
	            ig.game.socket.emit('connectToLobby', {});
	            ig.global.auth = { remoteId: data.gamedata.id, ssec: data.authkey };
	            console.log("ClassData:", JSON.parse(data.gamedata.pClass));
	            //Start Game
	            ig.game.pageTransition = true;
	            //Set loading screen position
	            randomQuote();
                $("#loadingscreen").css({
                    left: "0px"
                });
	            ig.system.setGame(PlayGame);
	        });
            //Generate Gamelist data
	        this.socket.on('gamelist', function (players) {
	            //console.log("Playerlist " + JSON.stringify(players));
	            ig.global.playerlisting = JSON.parse(players.plist);
	            ig.global.onlinecount = players.onlineCount;
	            var roomlist = new Array();
	            var playerlist = new Array();
	            //Sort by Room alphabetically
	            ig.global.playerlisting.sort(function (a, b) {
	                if (a.room < b.room) return -1;
	                if (a.room > b.room) return 1;
	                return 0;
	            })
	            //Clear all status back to offline or online
	            for (var f = 0; f < ig.global.friends.length; f++) {
	                $("div.friendrow[playername='" + ig.global.friends[f].name + "']").css("color", "#888888");
	            }

	            for (var f = 0; f < ig.global.friends.length; f++) {
	                for (var b = 0; b < players.ponline.length; b++) {
	                    if (players.ponline[b] == ig.global.friends[f].name) {
	                        $("div.friendrow[playername='" + ig.global.friends[f].name + "']").css("color", "#1ad1ff");
	                    }
	                }

	            }
                //Clear player listing
	            $("#chatlogplayerlist").html("");
	            var playerliststring = "";
	            //update player listing
	            for (var k = 0; k < players.onlinelist.length; k++) {
	                playerliststring += "<div style='display:table-row;'><div style='display:table-cell;'><div style='line-height: 16px;height: 16px;width: 80px;'>" + players.onlinelist[k].name + "</div></div></div>";
	            }
	            $("#chatlogplayerlist").html(playerliststring);


	            if (ig.global.playerlisting.length > 0) {
	                var prev;

	                

	                for (var p = 0; p < ig.global.playerlisting.length; p++) {
	                   

	                    if (ig.global.playerlisting[p].room != prev) {

	                        playerlist = [];
	                        roomlist.push({ roomId: ig.global.playerlisting[p].room, players: playerlist, lvlId: ig.global.playerlisting[p].level, gameStarted: false });

	                    }
	                    //Show game as started if ANY player is registered as started.
	                    if (ig.global.playerlisting[p].started == true) { roomlist[roomlist.length - 1].gameStarted = true; };

	                    roomlist[roomlist.length - 1].players.push(ig.global.playerlisting[p].name);
	                    prev = ig.global.playerlisting[p].room;
	                }

	                var finalString = "";
	                var pstring = "";
	                //console.log("filter statuses", $('#filtergamesFull').prop("checked"), $('#filtergamesStarted').prop("checked"));
	                for (var r = 0; r < roomlist.length; r++) {
	                    //finalString += "<div class=\"GameBrowserCurrentGames\">" + roomlist[r].roomId + ": " + roomlist[r].players.length + "/6 " + "<br>";
	                    var listGame = true;

	                    if ($('#filtergamesFull').prop("checked")) {
	                        if (roomlist[r].players.length >= 6) {
	                            listGame = false;
	                        }
	                    }

	                    if ($('#filtergamesStarted').prop("checked")) {
	                        if (roomlist[r].gameStarted) {
	                            listGame = false;
	                        }
	                    }

	                    if (listGame) {
	                        pstring = "";

	                        //Now, check who is online
	                        for (var p = 0; p < roomlist[r].players.length; p++) {
	                            var colorTag = "#FFFFFF";

	                            //Compare to friends list. Color player name green if a friend, and red if blocked
	                            //$("div.a[customattrib='2']") , this gets an element by class that matches an attribute
	                            //ig.global.friends
	                            var friend = null;
	                            for (var f = 0; f < ig.global.friends.length; f++) {
	                                //console.log(ig.global.friends[f].name, roomlist[r].players[p]);
	                                if (ig.global.friends[f].name == roomlist[r].players[p]) {
	                                    friend = ig.global.friends[f];
	                                    break;
	                                }
	                            }
	                            if (friend != null) {
	                                //console.log(friend);
	                                if (friend.status == 'blocked') {
	                                    colorTag = "#ff3333";
	                                } else if (friend.status == 'accepted') {
	                                    colorTag = "#1aff1a";
	                                }
	                                $("div.friendrow[playername='" + roomlist[r].players[p] + "']").css("color", colorTag);
	                            }


	                            pstring += "<div style=\"color:" + colorTag + ";\">" + roomlist[r].players[p] + "</div><br>";
	                        }
	                        //finalString += "</ div>";
	                        var gameId = "game" + r;
	                        finalString += "<DIV id='" + gameId + "' class=\"GameBrowserCurrentGames\"  rIndex='" + r + "' lvlId='" + roomlist[r].lvlId + "'>" + roomlist[r].roomId + ": " + roomlist[r].players.length + "/ " + ig.global.gamesizelimit + "<br>" + pstring + "</div>";
	                    }
	                }
	                
	                $("#GameBrowserGameList").html(finalString)

	            } else {
	                //No playerroom listing
	                $("#GameBrowserGameList").html("");
	            }
	            //Put most current into room listing.
	            ig.game.currentRoomListing = roomlist;

	            //Add click listeners to each game room
	            for (var r = 0; r < roomlist.length; r++) {
	                if ($("#game" + r).length) {
	                    if (roomlist[r].players.length >= 6) {
	                        $("#game" + r).css("background-color", "#03121B");
	                        $("#game" + r).append("Game is Full");
	                        if ($("#joinGameButton").attr("selectedRoom") == roomlist[r].roomId) {
	                            $("#joinGameButton").css("top", "-1000px");
	                        }
	                    } else {
	                        if (roomlist[r].gameStarted) {
	                            $("#game" + r).css("background-color", "#194d80");
	                            $("#game" + r).append("Game has started");
	                        }
	                        //Do I already have a select game? Move the join button to match location on the update listing.
	                        if ($("#joinGameButton").attr("selectedRoom") == roomlist[r].roomId) {
	                            $("#joinGameButton").css("top", ($("#game" + r).offset().top + 2) + "px");
	                            $("#joinGameButton").css("left", ($("#game" + r).offset().left + $("#game" + r).width() - 116) + "px");
	                        }
	                        //Readd the clicks
	                        $("#game" + r).click(function () {
	                            //console.log("Clicked a room, moving join button to : " + $(this).offset().top + " " + $(this).offset().left);
	                            //Remove all game selected classes from all rooms and only add the one I clicked
	                            for (var r = 0; r < ig.game.currentRoomListing.length; r++) {
	                                $("#game" + r).removeClass("gameselected");
	                            }
	                            $(this).addClass("gameselected");
	                            $("#joinGameButton").css("top", ($(this).offset().top + 2) + "px");
	                            $("#joinGameButton").css("left", ($(this).offset().left + $(this).width() - 116) + "px");
	                            //console.log("Join Button position : " + $("#joinGameButton").offset().top + " " + $("#joinGameButton").offset().left);
	                            ig.global.SelectedLevel = parseInt($(this).attr("lvlId"));
	                            ig.global.SocketRoom = ig.game.currentRoomListing[parseInt($(this).attr("rIndex"))].roomId;
	                            //Update button attribute for tracking
	                            $("#joinGameButton").attr("selectedRoom", ig.global.SocketRoom);
	                            //console.log("Current room selected to join: " + ig.global.SocketRoom + " current level index:" + ig.global.SelectedLevel);
	                        });
	                    }
	                }
	            }
	        });

	    }

        //Get current game information TIMER
	    this.updatelistTimer = new ig.Timer();
	    this.updatelistTimer.set(5);
	    this.updateGamelistData();
        //Create Hardpoint Positions Array
	    ig.global.hardpointPositions = [{ name: '#chassisFL', x: -92, y: -0 },
            { name: '#chassisFC', x: 2, y: -68 },
            { name: '#chassisFR', x: 96, y: -0 },
            { name: '#chassisLF', x: -92, y: -0 },
            { name: '#chassisRF', x: 96, y: -0 },
            { name: '#chassisC', x: 2, y: -68 },
            { name: '#chassisLB', x: -92, y: -0 },
            { name: '#chassisRB', x: 96, y: -0 },
            { name: '#chassisBL', x: -92, y: -0 },
            { name: '#chassisBC', x: 2, y: 88 },
            { name: '#chassisBR', x: 96, y: -0 }, ];

	    // Bind keys
	    ig.input.bind(ig.KEY.UP_ARROW, 'screenup');
	    ig.input.bind(ig.KEY.DOWN_ARROW, 'screendown');
	    ig.input.bind(ig.KEY.LEFT_ARROW, 'screenleft');
	    ig.input.bind(ig.KEY.RIGHT_ARROW, 'screenright');
		ig.input.bind(ig.KEY.MOUSE1, 'leftButton');
		ig.input.bind(ig.KEY.MOUSE2, 'rightButton');
		
		ig.input.bind(ig.KEY.W, 'forwardGear');
		ig.input.bind(ig.KEY.A, 'rotateLeft');
		ig.input.bind(ig.KEY.D, 'rotateRight');
		ig.input.bind(ig.KEY.S, 'reverseGear');
		ig.input.bind(ig.KEY.SPACE, 'breaks');
		ig.input.bind(ig.KEY.ESC, 'escape');

		ig.input.bind(ig.KEY.G, 'bot');

		ig.input.bind(ig.KEY.F, 'hudToggle');
		ig.input.bind(ig.KEY.E, 'reload');
		ig.input.bind(ig.KEY.Q, 'mapbeacon');
		ig.input.bind(ig.KEY.R, 'ultimate');
		
		ig.input.bind(ig.KEY.TAB, 'scoreboard');
		ig.input.bind(ig.KEY.Z, 'lockCamera');
		ig.input.bind(ig.KEY.K, 'instagibself');
		ig.input.bind(ig.KEY.M, 'openCommandMap');
		ig.input.bind(ig.KEY.L, 'testsync');
		ig.input.bind(ig.KEY._0, 'keypad0');
		ig.input.bind(ig.KEY._1, 'keypad1');
		ig.input.bind(ig.KEY._2, 'keypad2');
		ig.input.bind(ig.KEY._3, 'keypad3');
		ig.input.bind(ig.KEY._4, 'keypad4');
		ig.input.bind(ig.KEY._5, 'keypad5');
		ig.input.bind(ig.KEY._6, 'keypad6');
		ig.input.bind(ig.KEY._7, 'keypad7');
		ig.input.bind(ig.KEY._8, 'keypad8');
		ig.input.bind(ig.KEY._9, 'keypad9');
		ig.input.bind(ig.KEY.SHIFT, 'multiselect');
		if( ig.ua.mobile ) {
			ig.input.bindTouch( '#buttonLeft', 'left' );
			ig.input.bindTouch( '#buttonRight', 'right' );
			ig.input.bindTouch( '#buttonShoot', 'shoot' );
			ig.input.bindTouch( '#buttonJump', 'jump' );
		}


		// Load the LevelTest as required above ('game.level.test')
		this.loadLevel(LevelTitlelevel);

	    //CreatePointer
		ig.game.mousePointer = ig.game.spawnEntity(EntityPointer, 0, 0, {});

		var w = ig.system.width;
		var h = ig.system.height;

		this.TitleImage = ig.game.spawnEntity(EntityEyecandy, (w / 2) - (240), -340, {
		    size: { x: 480, y: 340 },
		    animSheet: new ig.AnimationSheet('media/titlescreen1.png', 480, 340),
		    zIndex: 100,
		    tileSeries: [0]
		});

		this.banner1 = ig.game.spawnEntity(EntityEyecandy, (w / 2) - (256), 0, {
		    size: { x: 512, y: 384 },
		    animSheet: new ig.AnimationSheet('media/128studiobg2.png', 512, 384),
		    zIndex: 5000,
		    tileSeries: [0]
		});
		this.banner2 = ig.game.spawnEntity(EntityEyecandy, (w / 2) - (256), 0, {
		    size: { x: 512, y: 384 },
		    animSheet: new ig.AnimationSheet('media/logo_impact.png', 512, 384),
		    zIndex: 5000,
		    tileSeries: [0]
		});

		this.startGame = ig.game.spawnEntity(Button, (w / 2) - (64), h - 128, {
		    size: { x: 128, y: 64 },
		    animSheet: new ig.AnimationSheet('media/transparentbutton128x64.png', 128, 64),
		    font: new ig.Font('media/fonts/visitor_s20_white.font.png', { borderColor: '#000', borderSize: 1 }),
		    text: ["Start Game"],
		    canvasfont: false,
		    fontsize: 20,
		    zIndex: 800,
		    tileSeries: [0, 0, 0],
		    ignorePause: true,
		    tooltip: "",
		    buttontextFadeCount: 0,
		    buttontextFadeTime: 90,
		    buttontextFadeStatus: 'in',
		    buttontextFadeRate: 1,
		    buttontextFadeRepeat: true,
		    buttontextFadeToggle: true,
		    buttontextFadeEnabled: true,
		    pressedUp: function () {
		        //Open the tips menu
		        if (window.innerHeight != screen.height) {
		            // browser is fullscreen
		            ig.game.getTip(5, 32, 32, true);
		        }
		        $("#mainmenu").css("top", (window.innerHeight*(1/4)) + "px");

		        ig.game.startGame.tween({ pos: { y: -300 } }, 2.5, { delay: 0, easing: ig.Tween.Easing.Bounce.EaseOut }).start();
		        //ig.game.TitleImage.tween({ pos: { y: -200 } }, 2.5, { easing: ig.Tween.Easing.Bounce.EaseOut }).start();

		        $("#joinGameButton").click(function () {		            
		            if (ig.global.started == false) {
		                themesound.stop();
		                //console.log("join game by " + ig.global.playerName);
		                ig.game.socket.emit('connectToLobby', {});
		                ig.global.playerIsHost = false;
		                ig.game.pageTransition = true;
		                //Set loading screen position
		                randomQuote();
                        $("#loadingscreen").css({
                            left: "0px"
                        });
		                ig.system.setGame(SelectPlayer);
		                ig.global.started = true;
		                $("#GameBrowserParent").css("top", "-1000px");
		                $("#joinGameButton").css("top", "-1000px");
		                $("#mainmenu").css("top", "-1000px");
		            }
		        });
		    }
		});
		
		ig.game.sortEntitiesDeferred();//Resort the entities
		this.TitleImage.tween({ pos: { y: 48 } }, 2.5, { delay: 3, easing: ig.Tween.Easing.Bounce.EaseOut }).start();
		//var myTween = this.classSelectSupport.tween({ currentAnim: { angle: 2.1 } }, 5.0);
	    //myTween.start();
		this.introBanner = { timer: new ig.Timer(2), index: 0 };
       

	    //Check for saved game options and restore them if they exists
		if (ig.game.gameStorage.isSet('hardpointoptions') == true) {
		    var gameInfo = ig.game.gameStorage.get('hardpointoptions');

		    ig.global.soundMaster.current = gameInfo.sound;
		    for (var i = soundManager.soundIDs.length - 1; i >= 0; i--) {
		        var idCategory = soundManager.soundIDs[i].split("_");
		        if (idCategory[0] == 'music') {
		            soundManager.sounds[soundManager.soundIDs[i]].setVolume(ig.global.musicMaster.current);
		        } else {
		            soundManager.sounds[soundManager.soundIDs[i]].setVolume(ig.global.soundMaster.current);
		        }
		    }
		    ig.global.musicMaster.current = gameInfo.music;//Later, use a music specific array
		    ig.global.radarLocation.current = gameInfo.radarLocation;
		    ig.global.particleCount.current = gameInfo.particleCount;
		    ig.global.tipsEnabled.current = gameInfo.tips;

		    $('#slider_sound').val(ig.global.soundMaster.current);
		    $('#optMenu_soundlevel').html(ig.global.soundMaster.current);
		    
		    $('#slider_music').val(ig.global.musicMaster.current);
		    $('#optMenu_musiclevel').html(ig.global.musicMaster.current);
		    
		    //Move select bars
		    if (ig.global.tipsEnabled.current) {
		        optMenuSetBarPosition($("#optMenu_tipsOn"), $("#optMenu_tipsselectbar"));
		    } else {
		        optMenuSetBarPosition($("#optMenu_tipsOff"), $("#optMenu_tipsselectbar"));
		    }

		    if (ig.global.particleCount.current == 0) {
		        optMenuSetBarPosition($("#optMenu_parEffOff"), $("#optMenu_partselectbar"));
		    } else if (ig.global.particleCount.current == 1) {
		        optMenuSetBarPosition($("#optMenu_parEffLow"), $("#optMenu_partselectbar"));
		    } else if (ig.global.particleCount.current == 3) {
		        optMenuSetBarPosition($("#optMenu_parEffNormal"), $("#optMenu_partselectbar"));
		    } else {
		        optMenuSetBarPosition($("#optMenu_parEffNormal"), $("#optMenu_partselectbar"));
		    }

		    if (ig.global.radarLocation.current >= (window.innerWidth - (window.innerWidth / 16 * ig.system.scale) - 0)) {
		        optMenuSetBarPosition($("#optMenu_mmright"), $("#optMenu_mmselectbar"));
		    } else if (ig.global.radarLocation.current == 32) {
		        optMenuSetBarPosition($("#optMenu_mmleft"), $("#optMenu_mmselectbar"));
		    }else{
		        optMenuSetBarPosition($("#optMenu_mmcenter"), $("#optMenu_mmselectbar"));
            }
		}

	    //Enable click for removing oldgame content		
		$("#reconnectNo").click(function () {
		    $("#reconnectWarningParent").css("top", "-1000px");
		    ig.game.gameStorage.remove('gameinfo');
		    //location.reload();
		});
	    //FIlters for Game Browser Click calls
		$('#filtergamesFull').click(function () {
		    $("#joinGameButton").css("top", "-1000px");
		    ig.game.updateGamelistData();
		});
		$('#filtergamesStarted').click(function () {
		    $("#joinGameButton").css("top", "-1000px");
		    ig.game.updateGamelistData();
		});
        
        //finished init, so remove loading screen transition
        $("#loadingscreen").css({
            left: "-3000px"
        });
        
	},
	checkReconnectStatus: function (pgid) {
	    if (typeof io !== 'undefined') {
	        this.socket.emit('getReconnectStatus', { pgid: pgid });
	    } else {
	        if (this.connectionError == false) {
	            this.connectionError = true;
	            $("#serverConnectionNotice").css("top", "100px");
	        }
	    }

	},
	updateGamelistData: function () {
	    //Need check here for IO to exists so it can connect
        if (typeof io !== 'undefined') {
	        //Get current game information

	        this.socket.emit('callgamelist', {friends: ig.global.friends});
	        
	    } else {
            //io is undefined, so the server is not up more than likely.
            if (this.connectionError == false) {
                this.connectionError = true;
                $("#serverConnectionNotice").css("top", "100px");
            }
	        console.log("Not connected");
	    }
	},
	checkRoomName: function(roomname){//attach to an on change event for typing in the name
	    var found = false;
	    for (var r = 0; r < this.currentRoomListing.length; r++) {
	        if (roomname == this.currentRoomListing[r].roomId) {
	            found = true;
	            break;
	        }
	    }
	    return found;
	},
	loadLevel: function( data ) {
		this.parent( data );
		for( var i = 0; i < this.backgroundMaps.length; i++ ) {
			this.backgroundMaps[i].preRender = true;
		}
	},
	
	update: function() {
	    // Update all entities and BackgroundMaps
	    this.parent();
        //Update Global list once I have a socket id to assign my player name.
	    if (this.updatedOnlineName == false && this.socketid != 0) {
	        this.updatedOnlineName = true;
	        ig.game.socket.emit('updateOnlineArray', { name: ig.global.playerName });
	    }
	    if (this.introBanner.timer.delta() >= 0 && this.introBanner.index < 2) {
	        this.introBanner.index++;
	        this.introBanner.timer.reset();
	        //console.log("Trigger Banner change :  " + this.introBanner.index);
	        if (this.introBanner.index > 2) {
	            this.introBanner.timer.pause();
	        } else if (this.introBanner.index == 2) {
	            this.banner1.pos.y = -500;
	        } else if (this.introBanner.index == 1) {
	            this.banner2.pos.y = -500;
	        }
	    }
	    if (this.updatelistTimer.delta() > 0) {
	        if (this.socket != undefined) {
	            this.updateGamelistData();
	            this.updatelistTimer.reset();
                //Reset chat count so you are not blocked from spam
	            ig.global.chatcount = 0;
	        }
	        if ($("#frienderrors").attr("error") == "true") {
	            $("#frienderrors").attr("error", 'false');
	            $("#frienderrors").html("");
	        }
	    }
	    //Get match history data if not already received
	    if (ig.global.mhistory.retrieved == false && ig.global.login.id != 0 && this.socket != undefined) {
            ig.global.mhistory.retrieved = true;
	        this.socket.emit('getMatchHistory', { pid: ig.global.login.id });
    	}

	},
	
	draw: function() {
		// Draw all entities and BackgroundMaps
	    this.parent();
	    img = new Image();
	    img.src = '../hardpoint_b5/media/menubg2.png';
	    //var ptrn = ig.system.context.createPattern(img, 'repeat'); // Create a pattern with this image, and set it to "repeat".
	    //ig.system.context.fillStyle = ptrn;
	    //ig.system.context.fillRect(0, 0, canvas.width, canvas.height); // context.fillRect(x, y, width, height);
	    ig.system.context.drawImage(img, 0, 0, canvas.width, canvas.height);

		this.TitleImage.draw();
		this.startGame.draw();
		ig.game.mousePointer.draw();
		if (this.introBanner.index < 2) {
		    if (this.introBanner.index == 1) {
		        ig.system.context.fillStyle = "#000000";
		        ig.system.context.fillRect(0, 0, canvas.width, canvas.height);
		    } else if (this.introBanner.index == 0) {
		        ig.system.context.fillStyle = "#000000";
		        ig.system.context.fillRect(0, 0, canvas.width, canvas.height);
		    }
		    this.banner1.draw();
		    this.banner2.draw();
		}
	    //
		this.font10yellowbrown.draw("ONLINE#" + ig.global.onlinecount + "      INGAME#" + ig.global.playerlisting.length + "      LFG#" + (ig.global.onlinecount - ig.global.playerlisting.length), ig.system.width / 2, ig.system.height - 64, ig.Font.ALIGN.CENTER);

		this.font.draw("ver:" + (ig.global.gameversion), 28, ig.system.height - 40);
		if( !ig.ua.mobile ) {
			
		}

	},

	getEntityById: function (id) {
	    for (var i in this.entities) {
	        if (this.entities[i].id === id) {
	            return this.entities[i];
	        }
	    }
	    return null;
	},
	getEntityByRemoteId: function (id) {
	    var tEntities = this.getEntitiesByType(EntityPlayer);
	    for (var i in tEntities) {
	        if (tEntities[i].remoteId === id) {
	            return tEntities[i];
	        }
	    }
	    return null;
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
	sortFriendsList :function (obj1, obj2) {
	    if (obj1.status > obj2.status)
            return -1;
	    if (obj2.status > obj1.status)
            return 1;

        // obj1.RemindingTimestamp == obj2.RemindingTimestamp

	    if (obj1.name > obj2.name)
            return -1;
	    if (obj2.name > obj1.name)
            return 1;
	        return 0;
	    },
	updateFriendList: function (array) {
        //Sort friends list by blocked or other, and then alphabetical

	    array.sort(ig.game.sortFriendsList);

	    ig.global.friends = array;
	    //If status is pending, then offer a checkmark for confirm, or an X for reject. 
	    //Confirm accepts the friend, Reject removes the from both lists each other.
	    //If status is accepted, then offer a remove button. Which removes them both from each others lists.
	    //Font color is the following: Green (Online), Yellow (In-Game), Gray (Off-line)
        //Need span ids to be <friendname_statusbar> and gamelist call will update them.
	    var buttonConfirm = "<div action=\"confirm\" class=\"friendButton\" title=\"Confirm\">&#10004</div>"; //Confirm
	    var buttonReject = "<div action=\"reject\" class=\"friendButton\" title=\"Reject\">&#10008</div>"; //Reject
	    var buttonRemove = "<div action=\"remove\" class=\"friendButton\"title=\"Remove\">&#10754</div>"; //Reject
	    var selected = "";


	    var friendsHTML = ""
	    for (var f = 0; f < array.length; f++) {
	        if (array[f].status == 'pending') {
	            selected = buttonConfirm + buttonReject;
	        } else if (array[f].status == 'accepted') {
	            selected = buttonRemove;
	        } else if (array[f].status == 'sent') {
	            selected = buttonReject;
	        } else if (array[f].status == 'blocked') {
	            selected = buttonReject;
	        }
	        friendsHTML += "<div style=\"display:table-row;width:400px;\"><div style=\"display:table-cell\"><div class=\"friendrow\" style=\"border: solid #DDDDDD 1px; width: 400px;\" playername=\"" + array[f].name + "\">" + array[f].name + "<div style=\"float:right;\">[" + array[f].status +"]___"+ selected + "</div></div></div></div>"
	    }
	    $("#friendlist").html(friendsHTML);

        //Add Click Listeners for friendbutton class. Pass the attribute "action" and name to the effect function.
	    $(".friendButton").click(function () {
	        var action = $(this).attr('action');
	        var targetPlayerName = $(this).parent().parent().attr("playername");
           
	        if (action == 'confirm') {
	            ig.game.socket.emit('confirmFriend', { name: targetPlayerName, requestor: ig.global.playerName });
	        } else if (action == 'reject') {
	            ig.game.socket.emit('removeFriend', { name: targetPlayerName, requestor: ig.global.playerName });
	        } else if (action == 'remove') {
	            ig.game.socket.emit('removeFriend', { name: targetPlayerName, requestor: ig.global.playerName });
	        }

	    });
	}
});
//Customer loader
// Subclass the default loader
MyLoader = ig.Loader.extend({
    init: function (gameClass, resources) {
        randomQuote();

        this.gameClass = gameClass;
        this.resources = resources;

        ig.global.levels = [{ obj: LevelArenaofdeath, name: "Arena of Death", desc: "A central area is surrounded by mountain ridges, making flanking difficult, but possible.", imgsrc: "media/levelmaps/level1.png", minimapImg: null },
        { obj: LevelAbandondedfort, name: "Abandoned Fort", desc: "Old Walls and rock formations offer the clever player surprise positions from which to attack.", imgsrc: "media/levelmaps/level2.png", minimapImg: null },
        { obj: LevelWasteland1, name: "Wasteland", desc: "A desolate wasteland long since destroyed.", imgsrc: "media/levelmaps/Wasteland1.png", minimapImg: null },
        { obj: LevelBloodandoil, name: "Blood and Oil", desc: "An abandonded oil rig. Control the bridges as chokepoints if you want to win. ", imgsrc: "media/levelmaps/bloodandoil.PNG", minimapImg: null },
        { obj: LevelMountainpass, name: "Mountain Pass", desc: "Rough Terrain and close spawn points make the rush to take control of the object difficult. ", imgsrc: "media/levelmaps/bloodandoil.PNG", minimapImg: null }];

        //
        //Now, just make an array of minimap images to use in game based off the levels;
        //I may want to just make an array of all level objects and then make images from each of them, by returning
        //a value from the function.
        //Possible solution: http://impactjs.com/forums/help/dynamic-level-loading-require-at-runtime
        for (var v = 0; v < ig.global.levels.length; v++) {
            ig.global.levels[v].minimapImg = this.createMiniMap(ig.global.levels[v].obj);           
        }
        
        this._loadCallbackBound = this._loadCallback.bind(this);

        for (var i = 0; i < this.resources.length; i++) {
            this._unloaded.push(this.resources[i].path);
        }


    },
    draw: function () {
        // Add your drawing code here

        // This one clears the screen and draws the 
        // percentage loaded as text
        //var w = ig.system.realWidth;
        //var h = ig.system.realHeight;
        //ig.system.context.fillStyle = '#000000';
        //ig.system.context.fillRect(0, 0, w, h);
        
        //var percentage = (this.status * 100).round() + '%';
        //ig.system.context.font = "72px visitorTT1";
        //ig.system.context.fillStyle = '#ffffff';
        //ig.system.context.fillText(percentage, w / 2, h / 2);
        var p = (this.status * 100).round() / 100;
        if(this.prevStatus != p){
            $("#loadingbar").css({
                width: (p * 400) + "px"
            })
            
            this.prevStatus = p;
        }
        
        // var img = new Image();
        // img.src = "media/banner_loading.png";
        // ig.system.context.drawImage(img, (w/2) - 342, 150);


    },
    createMiniMap: function (data) {
        //I may want to make a global image context for just a drawing a whole image one time, since the map wont change.
        //This will be waaaaaaaaaaaay faster than drawing one pixel at a time.

        for (var i = 0; i < data.layer.length; i++) {
            var ld = data.layer[i];
            var rows = new Array();
            var cols = new Array();
            var mimimapdata = new Array();
            var rowsSmall = new Array();
            var colsSmall = new Array();
            var mimimapdataSmall = new Array();
            if (ld.name == 'collision') {


                //PRODUCE LARGE IMAGE
                var exp_rows = mag(ld.data, 1.0);

                for (var y = 0; y < ld.height*1.0; y++) {
                    cols = [];
                    cols.length = 0;

                    for (var x = 0; x < ld.width*1.0; x++) {
                        // If this tile is solid, find the rect of solid tiles starting
                        // with this one
                        //if (ld.data[y][x] == 1) {
                        if (exp_rows[y][x] == 1) {
                            cols.push("c");
                            mimimapdata.push("c");
                        } else {
                            cols.push("-");
                            mimimapdata.push("-");
                        }
                    }
                    rows.push(cols);
                }


                var minimapImagelarge = ig.system.context.createImageData(ld.width * 1.0, ld.height * 1.0);
                for (var i = 0; i < mimimapdata.length; i++) {
                    if (mimimapdata[i] == "c") {
                        minimapImagelarge.data[i * 4 + 0] = 255;
                        minimapImagelarge.data[i * 4 + 1] = 0;
                        minimapImagelarge.data[i * 4 + 2] = 0;
                        minimapImagelarge.data[i * 4 + 3] = 150;
                    } else {
                        minimapImagelarge.data[i * 4 + 0] = 255;
                        minimapImagelarge.data[i * 4 + 1] = 255;
                        minimapImagelarge.data[i * 4 + 2] = 255;
                        minimapImagelarge.data[i * 4 + 3] = 150;
                    }
                }
                // PRODUCE SMALL IMAGE
                for (var y = 0; y < ld.height; y++) {
                    colsSmall = [];
                    colsSmall.length = 0;

                    for (var x = 0; x < ld.width; x++) {

                        if (ld.data[y][x] == 1) {
                            colsSmall.push("c");
                            mimimapdataSmall.push("c");
                        } else {
                            colsSmall.push("-");
                            mimimapdataSmall.push("-");
                        }
                    }
                    rowsSmall.push(colsSmall);
                }


                var minimapImagesmall = ig.system.context.createImageData(ld.width, ld.height);
                for (var i = 0; i < mimimapdataSmall.length; i++) {
                    if (mimimapdataSmall[i] == "c") {
                        minimapImagesmall.data[i * 4 + 0] = 255;
                        minimapImagesmall.data[i * 4 + 1] = 0;
                        minimapImagesmall.data[i * 4 + 2] = 0;
                        minimapImagesmall.data[i * 4 + 3] = 150;
                    } else {
                        minimapImagesmall.data[i * 4 + 0] = 255;
                        minimapImagesmall.data[i * 4 + 1] = 255;
                        minimapImagesmall.data[i * 4 + 2] = 255;
                        minimapImagesmall.data[i * 4 + 3] = 150;
                    }
                }
                return { large: minimapImagelarge, small: minimapImagesmall};
            }
        }

    },
});

if( ig.ua.iPad ) {
	ig.Sound.enabled = false;
	ig.main('#canvas', MyGame, 60, 240, 160, 2);
}
else if( ig.ua.mobile ) {	
	ig.Sound.enabled = false;
	ig.main('#canvas', MyGame, 60, 160, 160, 2);
}
else {
    function resizeForFullScreen() {
        ig.system.resize(window.innerWidth / 2, window.innerHeight / 2, 2)
        //console.log(window.innerWidth, window.innerHeight);
        //Add some code to detect size and adjust for the game screen size.
        //Just have a best fit resolution to keep it fair? I'm not sure if I care that much, but it the game does 
        //benefit large screen resolutions right now.
    }
    function mag(arr, scale) {
        var res = [];
        if (!arr.length)
            return arr;
        for (var i = 0; i < arr.length; i++) {
            var temp = mag(arr[i], scale);
            for (var k = 0; k < scale; k++) {
                res.push(temp.slice ? temp.slice(0) : temp);
            }
        }
        return res;
    }
    console.log(window.innerWidth, window.innerHeight);
    //ig.main('#canvas', MyGame, 60, 320, 240, 2);window.innerWidth;innerHeight;

    //Laptop screen with 32 div borders and 1399x789
    //ig.main('#canvas', MyGame, 60, 880, 436, 2, MyLoader);

    ig.main('#canvas', MyGame, 60, window.innerWidth / 2, window.innerHeight / 2, 2, MyLoader);
    //ig.main('#canvas', MyGame, 60, window.innerWidth, window.innerHeight, 1, MyLoader);
    window.addEventListener('resize', resizeForFullScreen, false);

}

});
